import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Customer } from '@/models/Customer'
import { customerSchema } from '@/lib/validations'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'crm')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  const customer = await Customer.findOne({ _id: id, tenantId: ctx.tenantId }).lean()
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: customer })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'crm')
  if (denied) return denied

  const body = await req.json()
  const parsed = customerSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const { id } = await params
  const customer = await Customer.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    parsed.data,
    { new: true }
  ).lean()
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: customer })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'crm')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  await Customer.findOneAndDelete({ _id: id, tenantId: ctx.tenantId })
  return NextResponse.json({ success: true })
}
