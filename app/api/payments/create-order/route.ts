import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Invoice } from '@/models/Invoice'
import { Payment } from '@/models/Payment'
import { getRazorpay } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'payments')
  if (denied) return denied

  const { invoiceId } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })

  await connectDB()
  const invoice = await Invoice.findOne({ _id: invoiceId, tenantId: ctx.tenantId }).lean()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 409 })
  }

  const razorpay = getRazorpay()
  const order = await razorpay.orders.create({
    amount: Math.round(invoice.total * 100), // in paise
    currency: 'INR',
    receipt: invoice.invoiceNo,
    notes: { invoiceId: invoiceId, tenantId: ctx.tenantId },
  })

  await Invoice.findByIdAndUpdate(invoiceId, { razorpayOrderId: order.id })

  return NextResponse.json({
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    },
  })
}
