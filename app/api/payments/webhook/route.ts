import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Invoice } from '@/models/Invoice'
import { Payment } from '@/models/Payment'
import crypto from 'crypto'

// Razorpay webhook — no session auth, but signature-verified
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  if (expected !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(body)
  const event = payload.event as string

  await connectDB()

  if (event === 'payment.captured') {
    const payment = payload.payload.payment.entity
    const orderId = payment.order_id
    const invoice = await Invoice.findOneAndUpdate(
      { razorpayOrderId: orderId, status: { $ne: 'paid' } },
      { status: 'paid' },
      { new: true }
    ).lean()

    if (invoice) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { status: 'captured', razorpayPaymentId: payment.id, paidAt: new Date() },
        { upsert: false }
      )
    }
  }

  if (event === 'payment.failed') {
    const payment = payload.payload.payment.entity
    await Payment.findOneAndUpdate(
      { razorpayOrderId: payment.order_id },
      { status: 'failed' }
    )
  }

  return NextResponse.json({ received: true })
}
