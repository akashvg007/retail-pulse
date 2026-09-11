import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Invoice } from '@/models/Invoice'
import { Product } from '@/models/Product'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  const invoice = await Invoice.findOne({ _id: id, tenantId: ctx.tenantId }).lean()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (!invoice.inventoryDeductedAt) {
    return NextResponse.json({ error: 'This invoice has not deducted inventory' }, { status: 400 })
  }
  if (invoice.refundedAt) {
    return NextResponse.json({ error: 'This invoice has already been returned' }, { status: 400 })
  }

  const qtyByProductId = new Map<string, number>()
  for (const item of invoice.items ?? []) {
    if (!item.productId) {
      return NextResponse.json({ error: `Missing product reference for item "${item.name}"` }, { status: 400 })
    }
    const productId = item.productId.toString()
    qtyByProductId.set(productId, (qtyByProductId.get(productId) ?? 0) + Math.max(0, Number(item.qty ?? 0)))
  }

  const claimed = await Invoice.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId, inventoryDeductedAt: { $exists: true }, refundedAt: { $exists: false } },
    { $set: { refundedAt: new Date(), status: 'cancelled' } },
    { new: true }
  ).lean()
  if (!claimed) {
    return NextResponse.json({ error: 'This invoice has already been returned' }, { status: 400 })
  }

  const touched: Array<{ productId: string; qty: number }> = []

  try {
    for (const [productId, qty] of qtyByProductId) {
      const result = await Product.updateOne(
        { _id: productId, tenantId: ctx.tenantId },
        { $inc: { stockQty: qty } }
      )
      if (result.matchedCount !== 1) {
        throw new Error(`Product for returned item was not found: ${productId}`)
      }
      touched.push({ productId, qty })
    }
  } catch (error) {
    await Promise.all(
      touched.map(({ productId, qty }) =>
        Product.updateOne({ _id: productId, tenantId: ctx.tenantId }, { $inc: { stockQty: -qty } })
      )
    )
    await Invoice.updateOne({ _id: id, tenantId: ctx.tenantId }, { $unset: { refundedAt: 1 }, $set: { status: invoice.status } })
    const message = error instanceof Error ? error.message : 'Unable to restore inventory'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ data: claimed })
}