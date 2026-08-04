import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { PurchaseOrder } from '@/models/PurchaseOrder'

const updatePurchaseSchema = z.object({
  action: z.enum(['approve', 'send', 'receive', 'cancel']).optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
})

function applyAction(order: {
  status: string
  total: number
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
  }
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
    const result = applyAction(existing)[parsed.data.action]()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    Object.assign(updates, result)
  }

  const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    updates,
    { new: true }
  ).lean()

  return NextResponse.json({ data: purchaseOrder })
}