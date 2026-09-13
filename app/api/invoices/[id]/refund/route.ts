import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Invoice } from '@/models/Invoice'
import { Product } from '@/models/Product'

export async function POST(
  req: NextRequest,
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
    return NextResponse.json({ error: 'This invoice has already been fully returned' }, { status: 400 })
  }

  let body: { items?: Array<{ itemIndex?: unknown; qty?: unknown }> } = {}
  try {
    body = await req.json()
  } catch {
    // An empty body means return every remaining item, preserving the old API behavior.
  }

  const requested = new Map<number, number>()
  if (Array.isArray(body.items)) {
    for (const entry of body.items) {
      const itemIndex = Number(entry?.itemIndex)
      const qty = Number(entry?.qty)
      if (!Number.isInteger(itemIndex) || itemIndex < 0 || !Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ error: 'Each returned item must have a valid line number and whole quantity' }, { status: 400 })
      }
      if (itemIndex >= (invoice.items ?? []).length) {
        return NextResponse.json({ error: 'Returned item line does not exist on this invoice' }, { status: 400 })
      }
      if (requested.has(itemIndex)) {
        return NextResponse.json({ error: 'An invoice line can only be returned once per request' }, { status: 400 })
      }
      requested.set(itemIndex, qty)
    }
  } else if (body.items !== undefined) {
    return NextResponse.json({ error: 'Returned items must be an array' }, { status: 400 })
  }

  if (requested.size === 0) {
    for (let itemIndex = 0; itemIndex < (invoice.items ?? []).length; itemIndex += 1) {
      const item = invoice.items[itemIndex]
      const remaining = Math.max(0, item.qty - Number(item.returnedQty ?? 0))
      if (remaining > 0) requested.set(itemIndex, remaining)
    }
  }
  if (requested.size === 0) {
    return NextResponse.json({ error: 'There are no quantities left to return' }, { status: 400 })
  }

  const qtyByProductId = new Map<string, number>()
  const claimConditions: Record<string, unknown>[] = []
  let willBeFullyReturned = true
  for (let itemIndex = 0; itemIndex < (invoice.items ?? []).length; itemIndex += 1) {
    const item = invoice.items[itemIndex]
    const currentReturned = Number(item.returnedQty ?? 0)
    const remaining = Math.max(0, item.qty - currentReturned)
    const returnQty = requested.get(itemIndex) ?? 0
    if (returnQty > remaining) {
      return NextResponse.json({ error: `Cannot return more than the remaining quantity for "${item.name}"` }, { status: 400 })
    }
    if (returnQty > 0) {
      if (!item.productId) {
        return NextResponse.json({ error: `Missing product reference for item "${item.name}"` }, { status: 400 })
      }
      const productId = item.productId.toString()
      qtyByProductId.set(productId, (qtyByProductId.get(productId) ?? 0) + returnQty)
      claimConditions.push({
        $or: [
          { [`items.${itemIndex}.returnedQty`]: { $exists: false } },
          { [`items.${itemIndex}.returnedQty`]: { $lte: item.qty - returnQty } },
        ],
      })
    }
    if (returnQty !== remaining) willBeFullyReturned = false
  }

  const increment: Record<string, number> = {}
  for (const [itemIndex, qty] of requested) increment[`items.${itemIndex}.returnedQty`] = qty
  const claimed = await Invoice.findOneAndUpdate(
    {
      _id: id,
      tenantId: ctx.tenantId,
      inventoryDeductedAt: { $exists: true },
      refundedAt: { $exists: false },
      $and: claimConditions,
    },
    { $inc: increment },
    { new: true }
  ).lean()
  if (!claimed) {
    return NextResponse.json({ error: 'The requested quantities have already been returned or changed' }, { status: 409 })
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
    const rollback: Record<string, number> = {}
    for (const [itemIndex, qty] of requested) rollback[`items.${itemIndex}.returnedQty`] = -qty
    await Invoice.updateOne({ _id: id, tenantId: ctx.tenantId }, { $inc: rollback })
    const message = error instanceof Error ? error.message : 'Unable to restore inventory'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const allReturned = claimed.items.every((item) => Number(item.returnedQty ?? 0) >= item.qty)
  const completed = allReturned || willBeFullyReturned
    ? await Invoice.findOneAndUpdate(
        { _id: id, tenantId: ctx.tenantId, refundedAt: { $exists: false } },
        { $set: { refundedAt: new Date(), status: 'cancelled' } },
        { new: true }
      ).lean()
    : claimed

  return NextResponse.json({ data: completed })
}