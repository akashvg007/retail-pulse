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

  const { invoiceId, amountReceived } = await req.json()

  if (!invoiceId) {
    return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
  }

  const received = Number(amountReceived)
  if (!Number.isFinite(received) || received <= 0) {
    return NextResponse.json({ error: 'Valid amountReceived required' }, { status: 400 })
  }

  await connectDB()

  const invoice = await Invoice.findOne({ _id: invoiceId, tenantId: ctx.tenantId }).lean()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 })
  }
  if (received < invoice.total) {
    return NextResponse.json({ error: 'Received amount is less than invoice total' }, { status: 400 })
  }

  const payment = await Payment.create({
    tenantId: ctx.tenantId,
    invoiceId,
    amount: invoice.total,
    method: 'cash',
    status: 'captured',
    paidAt: new Date(),
  })

  await Invoice.findByIdAndUpdate(invoiceId, { status: 'paid' })

  return NextResponse.json({
    data: {
      payment,
      balance: received - invoice.total,
    },
  })
}
