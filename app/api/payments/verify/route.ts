import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasFeature } from '@/lib/features'
import { Invoice } from '@/models/Invoice'
import { Payment } from '@/models/Payment'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'payments')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } =
    await req.json()

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !invoiceId) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
  }

  // Verify signature
  const text = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(text)
    .digest('hex')

  if (expectedSig !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  await connectDB()
  const invoice = await Invoice.findOne({ _id: invoiceId, tenantId: ctx.tenantId }).lean()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const payment = await Payment.create({
    tenantId: ctx.tenantId,
    invoiceId,
    amount: invoice.total,
    method: 'razorpay',
    razorpayPaymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpaySignature: razorpay_signature,
    status: 'captured',
    paidAt: new Date(),
  })

  await Invoice.findByIdAndUpdate(invoiceId, { status: 'paid' })

  return NextResponse.json({ data: payment })
}
