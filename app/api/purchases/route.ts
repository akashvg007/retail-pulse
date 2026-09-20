import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { purchaseOrderSchema } from '@/lib/validations'
import { computePurchaseTotals, normalizePurchaseLine } from '@/lib/purchase-calculations'
import { PurchaseOrder } from '@/models/PurchaseOrder'
import { Supplier } from '@/models/Supplier'
import { Tenant } from '@/models/Tenant'
import { generatePurchaseOrderNo } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'purchase_management')
  if (denied) return denied

  await connectDB()
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 20))
  const status = searchParams.get('status')?.trim() ?? ''
  const search = searchParams.get('search')?.trim() ?? ''

  const filter: Record<string, unknown> = { tenantId: ctx.tenantId }
  if (status) filter.status = status
  if (search) {
    filter.$or = [
      { poNo: { $regex: search, $options: 'i' } },
      { 'supplierSnapshot.name': { $regex: search, $options: 'i' } },
      { 'supplierSnapshot.code': { $regex: search, $options: 'i' } },
    ]
  }

  const [data, total] = await Promise.all([
    PurchaseOrder.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
    PurchaseOrder.countDocuments(filter),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'purchase_management')
  if (denied) return denied

  const body = await req.json()
  const parsed = purchaseOrderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()

  const supplier = await Supplier.findOne({
    _id: parsed.data.supplierId,
    tenantId: ctx.tenantId,
    active: true,
  }).lean()
  if (!supplier) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  const items = parsed.data.items.map((item) => {
    const normalized = normalizePurchaseLine(item)
    return {
      ...normalized,
      productId: normalized.productId || undefined,
      receivedQty: 0,
      returnedQty: 0,
    }
  })

  const totals = computePurchaseTotals(items, parsed.data.roundingAdjustment)

  const tenant = await Tenant.findByIdAndUpdate(
    ctx.tenantId,
    { $inc: { purchaseOrderCounter: 1 } },
    { new: true }
  ).lean()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const purchaseOrder = await PurchaseOrder.create({
    tenantId: ctx.tenantId,
    poNo: generatePurchaseOrderNo(tenant.purchaseOrderCounter),
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
    ocrMeta: parsed.data.ocrMeta
      ? {
        source: parsed.data.ocrMeta.source,
        confidence: parsed.data.ocrMeta.confidence,
        extractedAt: new Date(parsed.data.ocrMeta.extractedAt),
        warnings: parsed.data.ocrMeta.warnings,
      }
      : undefined,
  })

  return NextResponse.json({ data: purchaseOrder }, { status: 201 })
}
