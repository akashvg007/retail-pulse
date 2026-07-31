import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Invoice } from '@/models/Invoice'
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

  const filter: Record<string, unknown> = { tenantId: ctx.tenantId }
  if (status) filter.status = status

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

  const { customerId, items, discount = 0, dueDate, notes } = parsed.data

  // Compute totals
  let subtotal = 0
  let taxAmount = 0
  for (const item of items) {
    subtotal += item.price * item.qty
    taxAmount += (item.price * item.qty * item.taxRate) / 100
  }
  const total = subtotal + taxAmount - discount

  // Get customer snapshot
  let customerSnapshot
  if (customerId) {
    const customer = await Customer.findOne({ _id: customerId, tenantId: ctx.tenantId }).lean()
    if (customer) {
      customerSnapshot = { name: customer.name, email: customer.email, gstNumber: customer.gstNumber }
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
    customerId: customerId || undefined,
    customerSnapshot,
    items,
    subtotal,
    taxAmount,
    discount,
    total,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    notes,
  })

  return NextResponse.json({ data: invoice }, { status: 201 })
}
