import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { PurchaseOrder } from '@/models/PurchaseOrder'
import { Product } from '@/models/Product'

const updatePurchaseSchema = z.object({
  action: z.enum(['approve', 'send', 'receive', 'cancel', 'add_to_inventory']).optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
})

function applyAction(order: {
  status: string
  total: number
  inventoryPostedAt?: Date
  items: Array<{ qty: number; receivedQty: number; returnedQty: number; unitCost: number; taxRate: number; total: number }>
}) {
  return {
    approve: () => {
      if (order.status !== 'draft') return { error: 'Only draft orders can be approved' }
      return { status: 'approved', approvedAt: new Date() }
    },
    send: () => {
      if (!['draft', 'approved'].includes(order.status)) return { error: 'Only draft or approved orders can be sent' }
      return {
        status: 'sent',
        approvedAt: order.status === 'draft' ? new Date() : undefined,
        sentAt: new Date(),
      }
    },
    receive: () => {
      if (!['approved', 'sent', 'partially_received'].includes(order.status)) {
        return { error: 'Only approved or sent orders can be received' }
      }
      return {
        status: 'received',
        receivedAt: new Date(),
        receivedValue: order.total,
        items: order.items.map((item) => ({ ...item, receivedQty: item.qty })),
      }
    },
    cancel: () => {
      if (order.status === 'received') return { error: 'Received orders cannot be cancelled' }
      if (order.status === 'cancelled') return { error: 'Order is already cancelled' }
      return { status: 'cancelled' }
    },
    add_to_inventory: () => {
      if (order.status !== 'received') {
        return { error: 'Only received orders can be posted to inventory' }
      }
      if (order.inventoryPostedAt) {
        return { error: 'This purchase order has already been posted to inventory' }
      }
      return {}
    },
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function generateSku(name: string, index: number) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6) || 'ITEM'
  const suffix = String(Date.now() + index).slice(-6)
  return `${base}-${suffix}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'purchase_management')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  const purchaseOrder = await PurchaseOrder.findOne({ _id: id, tenantId: ctx.tenantId }).lean()
  if (!purchaseOrder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: purchaseOrder })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'purchase_management')
  if (denied) return denied

  const body = await req.json()
  const parsed = updatePurchaseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const { id } = await params
  const existing = await PurchaseOrder.findOne({ _id: id, tenantId: ctx.tenantId }).lean()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (typeof parsed.data.notes === 'string') updates.notes = parsed.data.notes
  if (typeof parsed.data.expectedDeliveryDate === 'string') {
    updates.expectedDeliveryDate = parsed.data.expectedDeliveryDate
      ? new Date(parsed.data.expectedDeliveryDate)
      : undefined
  }

  if (parsed.data.action) {
    if (parsed.data.action === 'add_to_inventory') {
      const inventoryDenied = await requireFeature(ctx, 'inventory')
      if (inventoryDenied) return inventoryDenied
    }

    const result = applyAction(existing)[parsed.data.action]()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    Object.assign(updates, result)

    if (parsed.data.action === 'add_to_inventory') {
      const itemSummaries = await Promise.all(
        existing.items.map(async (item, index) => {
          const qtyToAdd = Math.max(0, Number(item.receivedQty || item.qty || 0))
          if (qtyToAdd <= 0) {
            return { name: item.name, sku: null, qtyAdded: 0 }
          }

          let product = null

          if (item.productId) {
            product = await Product.findOneAndUpdate(
              { _id: item.productId, tenantId: ctx.tenantId, active: true },
              {
                $inc: { stockQty: qtyToAdd },
                $set: { cost: item.unitCost, taxRate: item.taxRate },
              },
              { new: true }
            )
          }

          if (!product) {
            product = await Product.findOneAndUpdate(
              {
                tenantId: ctx.tenantId,
                active: true,
                name: { $regex: `^${escapeRegex(item.name)}$`, $options: 'i' },
              },
              {
                $inc: { stockQty: qtyToAdd },
                $set: { cost: item.unitCost, taxRate: item.taxRate },
              },
              { new: true }
            )
          }

          if (!product) {
            product = await Product.create({
              tenantId: ctx.tenantId,
              name: item.name,
              sku: generateSku(item.name, index),
              description: `Auto-created from ${existing.poNo}`,
              price: Number(item.unitCost || 0),
              cost: Number(item.unitCost || 0),
              category: 'Purchased',
              stockQty: qtyToAdd,
              taxRate: Number(item.taxRate || 0),
              active: true,
            })
          }

          return { name: item.name, sku: product.sku, qtyAdded: qtyToAdd }
        })
      )

      updates.inventoryPostedAt = new Date()
      updates.inventoryPostSummary = itemSummaries
    }
  }

  const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    updates,
    { new: true }
  ).lean()

  return NextResponse.json({ data: purchaseOrder })
}