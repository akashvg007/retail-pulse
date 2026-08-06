import { Invoice } from '@/models/Invoice'
import { Product } from '@/models/Product'

type DeductInventoryInput = {
  invoiceId: string
  tenantId: string
}

function isObjectIdLike(value: unknown): value is { toString: () => string } {
  return Boolean(value) && typeof value === 'object' && typeof (value as { toString?: unknown }).toString === 'function'
}

export async function deductInventoryForInvoiceSale({ invoiceId, tenantId }: DeductInventoryInput) {
  const now = new Date()

  // Claim this invoice so inventory is deducted at most once even if multiple callbacks fire.
  const invoice = await Invoice.findOneAndUpdate(
    { _id: invoiceId, tenantId, inventoryDeductedAt: { $exists: false } },
    { $set: { inventoryDeductedAt: now } },
    { new: false }
  ).lean()

  if (!invoice) {
    return { deducted: false, alreadyDeducted: true as const }
  }

  const qtyByProductId = new Map<string, { qty: number; name: string }>()

  for (const item of invoice.items ?? []) {
    const qty = Math.max(0, Number(item.qty ?? 0))
    if (qty <= 0) continue

    if (!item.productId || !isObjectIdLike(item.productId)) {
      await Invoice.updateOne({ _id: invoiceId, tenantId }, { $unset: { inventoryDeductedAt: 1 } })
      throw new Error(`Missing product reference for item "${item.name}"`)
    }

    const productId = item.productId.toString()
    const current = qtyByProductId.get(productId)
    if (current) {
      current.qty += qty
    } else {
      qtyByProductId.set(productId, { qty, name: item.name })
    }
  }

  const touched: Array<{ productId: string; qty: number }> = []

  try {
    for (const [productId, entry] of qtyByProductId) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: productId,
          tenantId,
          active: true,
          stockQty: { $gte: entry.qty },
        },
        { $inc: { stockQty: -entry.qty } },
        { new: true }
      ).lean()

      if (!updated) {
        const product = await Product.findOne({ _id: productId, tenantId }).lean()
        const availableQty = Number(product?.stockQty ?? 0)
        throw new Error(`Insufficient stock for \"${entry.name}\". Available: ${availableQty}, required: ${entry.qty}`)
      }

      touched.push({ productId, qty: entry.qty })
    }

    return { deducted: true as const, alreadyDeducted: false as const }
  } catch (error) {
    if (touched.length > 0) {
      await Promise.all(
        touched.map(({ productId, qty }) =>
          Product.updateOne(
            { _id: productId, tenantId },
            { $inc: { stockQty: qty } }
          )
        )
      )
    }

    await Invoice.updateOne({ _id: invoiceId, tenantId }, { $unset: { inventoryDeductedAt: 1 } })
    throw error
  }
}
