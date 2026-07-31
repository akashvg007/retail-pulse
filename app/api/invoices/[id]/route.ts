import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Invoice } from '@/models/Invoice'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  const invoice = await Invoice.findOne({ _id: id, tenantId: ctx.tenantId })
    .populate('customerId', 'name email phone gstNumber')
    .lean()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: invoice })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  const body = await req.json()
  await connectDB()
  const { id } = await params
  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    body,
    { new: true }
  ).lean()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: invoice })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  await Invoice.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId, status: { $in: ['draft', 'sent'] } },
    { status: 'cancelled' }
  )
  return NextResponse.json({ success: true })
}
