import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Invoice } from '@/models/Invoice'
import { Product } from '@/models/Product'
import { Customer } from '@/models/Customer'
import { Tenant } from '@/models/Tenant'
import { invoiceSchema } from '@/lib/validations'
import { generateInvoiceNo } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  await connectDB()
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 20))
  const status = searchParams.get('status')
  const search = searchParams.get('search')?.trim()

  const filter: Record<string, unknown> = { tenantId: ctx.tenantId }
  if (status) filter.status = status
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { invoiceNo: { $regex: escapedSearch, $options: 'i' } },
      { 'customerSnapshot.name': { $regex: escapedSearch, $options: 'i' } },
    ]
  }

  const [data, total] = await Promise.all([
    Invoice.find(filter)
      .populate('customerId', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Invoice.countDocuments(filter),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  const body = await req.json()
  const parsed = invoiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()

  const { customerId, items, discount = 0, taxInclusive, dueDate, notes } = parsed.data
  const productIds = items
    .map((item) => item.productId)
    .filter((productId): productId is string => Boolean(productId))
  const products = productIds.length > 0
    ? await Product.find({ tenantId: ctx.tenantId, _id: { $in: productIds } }).select('_id mrp').lean()
    : []
  const productMrp = new Map(products.map((product) => [String(product._id), product.mrp ?? 0]))
  const invoiceItems = items.map((item) => ({
    ...item,
    mrp: item.productId ? productMrp.get(item.productId) ?? item.mrp : item.mrp,
    total: item.price * item.qty,
  }))

  // Compute totals
  let subtotal = 0
  let taxAmount = 0
  for (const item of invoiceItems) {
    const gross = item.price * item.qty
    if (taxInclusive) {
      const itemTax = (gross * item.taxRate) / (100 + item.taxRate)
      subtotal += gross - itemTax
      taxAmount += itemTax
    } else {
      subtotal += gross
      taxAmount += (gross * item.taxRate) / 100
    }
  }
  const total = subtotal + taxAmount - discount

  // Get customer snapshot
  let customerSnapshot
  if (customerId) {
    const customer = await Customer.findOne({ _id: customerId, tenantId: ctx.tenantId }).lean()
    if (customer) {
      customerSnapshot = { name: customer.name, email: customer.email, address: customer.address, gstNumber: customer.gstNumber }
    }
  }

  // Atomic invoice counter
  const tenant = await Tenant.findByIdAndUpdate(
    ctx.tenantId,
    { $inc: { invoiceCounter: 1 } },
    { new: true }
  ).lean()
  const invoiceNo = generateInvoiceNo(tenant!.invoiceCounter)

  const invoice = await Invoice.create({
    tenantId: ctx.tenantId,
    invoiceNo,
    staffName: ctx.name,
    staffId: ctx.userId,
    customerId: customerId || undefined,
    customerSnapshot,
    items: invoiceItems,
    subtotal,
    taxAmount,
    discount,
    total,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    notes,
  })

  return NextResponse.json({ data: invoice }, { status: 201 })
}
