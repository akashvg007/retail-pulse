import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasFeature } from '@/lib/features'
import { Subscription } from '@/models/Subscription'

export async function GET() {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'subscriptions')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  await connectDB()
  const subscriptions = await Subscription.find({ tenantId: ctx.tenantId }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({ data: subscriptions })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'subscriptions')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const body = await req.json()
  const { plan, startDate } = body
  if (!plan || !startDate) {
    return NextResponse.json({ error: 'plan and startDate are required' }, { status: 400 })
  }

  await connectDB()
  const subscription = await Subscription.create({
    tenantId: ctx.tenantId,
    plan,
    startDate: new Date(startDate),
    razorpaySubscriptionId: body.razorpaySubscriptionId,
  })
  return NextResponse.json({ data: subscription }, { status: 201 })
}
