import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Invoice } from '@/models/Invoice'
import { Payment } from '@/models/Payment'

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'payments')
  if (denied) return denied

  const { invoiceId } = await req.json()

  if (!invoiceId) {
    return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
  }

  await connectDB()

  const invoice = await Invoice.findOne({ _id: invoiceId, tenantId: ctx.tenantId }).lean()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 })
  }

  const payment = await Payment.create({
    tenantId: ctx.tenantId,
    invoiceId,
    amount: invoice.total,
    method: 'upi',
    status: 'captured',
    paidAt: new Date(),
  })

  await Invoice.findByIdAndUpdate(invoiceId, { status: 'paid' })

  return NextResponse.json({ data: payment })
}
