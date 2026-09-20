import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { purchaseOrderSchema } from '@/lib/validations'
import { computePurchaseTotals, normalizePurchaseLine } from '@/lib/purchase-calculations'
import {
  normalizeInventoryPostSummary,
  postPurchaseItemsToInventory,
  reconcilePostedPurchaseInventory,
  withReceivedQuantities,
  type InventoryPostEntry,
} from '@/lib/purchase-inventory'
import { PurchaseOrder } from '@/models/PurchaseOrder'
import { Supplier } from '@/models/Supplier'

const actionUpdateSchema = z.object({
  action: z.enum(['approve', 'send', 'receive', 'cancel', 'add_to_inventory']).optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
})

function applyAction(order: {
  status: string
  total: number
  inventoryPostedAt?: Date
  items: Array<{ qty: number; receivedQty: number; returnedQty: number; unitCost: number; taxRate: number; total: number; price: number }>
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

function isFullOrderUpdate(body: unknown): body is Record<string, unknown> {
  return Boolean(
    body &&
    typeof body === 'object' &&
    ('supplierId' in body || 'items' in body || 'invoiceNo' in body)
  )
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
  await connectDB()
  const { id } = await params
  const existing = await PurchaseOrder.findOne({ _id: id, tenantId: ctx.tenantId }).lean()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (isFullOrderUpdate(body)) {
    const parsed = purchaseOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json({ error: 'Cancelled orders cannot be edited' }, { status: 400 })
    }

    const supplier = await Supplier.findOne({
      _id: parsed.data.supplierId,
      tenantId: ctx.tenantId,
      active: true,
    }).lean()
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const normalizedItems = parsed.data.items.map((item) => normalizePurchaseLine(item))
    const items = withReceivedQuantities(normalizedItems, existing.status, existing.items)
    const totals = computePurchaseTotals(items, parsed.data.roundingAdjustment)

    const updates: Record<string, unknown> = {
      supplierId: supplier._id,
      invoiceNo: parsed.data.invoiceNo,
      invoiceDate: new Date(parsed.data.invoiceDate),
      paymentTerms: parsed.data.paymentTerms,
      supplierSnapshot: {
        code: supplier.code,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        gstNumber: supplier.gstNumber,
      },
      items,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      sellingPriceTotal: totals.sellingPriceTotal,
      roundingAdjustment: totals.roundingAdjustment,
      expectedDeliveryDate: parsed.data.expectedDeliveryDate
        ? new Date(parsed.data.expectedDeliveryDate)
        : undefined,
      notes: parsed.data.notes,
    }

    if (existing.status === 'received') {
      updates.receivedValue = totals.total
    }

    if (existing.inventoryPostedAt) {
      const inventoryDenied = await requireFeature(ctx, 'inventory')
      if (inventoryDenied) return inventoryDenied

      const previousEntries = normalizeInventoryPostSummary(
        existing.inventoryPostSummary as Array<{
          productId?: string | null
          name?: string
          sku?: string | null
          qtyAdded?: number
          unitCost?: number
          price?: number
          mrp?: number
          taxRate?: number
          hsnCode?: string
        }>,
        existing.items
      )

      let nextSummary: InventoryPostEntry[]
      try {
        nextSummary = await reconcilePostedPurchaseInventory({
          tenantId: ctx.tenantId,
          poNo: existing.poNo,
          previousEntries,
          nextItems: items,
        })
        updates.inventoryPostSummary = nextSummary
        updates.items = items.map((item, index) => ({
          ...item,
          productId: nextSummary[index]?.productId || item.productId || undefined,
        }))
      } catch (reconcileError) {
        return NextResponse.json(
          {
            error:
              reconcileError instanceof Error
                ? reconcileError.message
                : 'Unable to reconcile inventory for this purchase order',
          },
          { status: 400 }
        )
      }

      const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
        { _id: id, tenantId: ctx.tenantId },
        updates,
        { new: true }
      ).lean()

      if (!purchaseOrder) {
        try {
          await reconcilePostedPurchaseInventory({
            tenantId: ctx.tenantId,
            poNo: existing.poNo,
            previousEntries: nextSummary,
            nextItems: existing.items,
          })
        } catch {
          // Preserve not-found response if restore also fails.
        }
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      return NextResponse.json({ data: purchaseOrder })
    }

    const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: id, tenantId: ctx.tenantId },
      updates,
      { new: true }
    ).lean()

    return NextResponse.json({ data: purchaseOrder })
  }

  const parsed = actionUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

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
      try {
        const itemSummaries = await postPurchaseItemsToInventory({
          tenantId: ctx.tenantId,
          poNo: existing.poNo,
          items: existing.items,
        })

        updates.inventoryPostedAt = new Date()
        updates.inventoryPostSummary = itemSummaries
        updates.items = existing.items.map((item, index) => ({
          ...item,
          productId: itemSummaries[index]?.productId || item.productId || undefined,
        }))
      } catch (inventoryError) {
        return NextResponse.json(
          {
            error:
              inventoryError instanceof Error
                ? inventoryError.message
                : 'Unable to add products to inventory',
          },
          { status: 400 }
        )
      }
    }
  }

  const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    updates,
    { new: true }
  ).lean()

  return NextResponse.json({ data: purchaseOrder })
}
