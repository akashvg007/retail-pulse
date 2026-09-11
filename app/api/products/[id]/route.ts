import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Product } from '@/models/Product'
import { productSchema } from '@/lib/validations'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'inventory')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  const product = await Product.findOne({ _id: id, tenantId: ctx.tenantId }).lean()
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: product })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'inventory')
  if (denied) return denied

  const body = await req.json()
  const parsed = productSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const { id } = await params
  const updates = {
    ...parsed.data,
    ...(parsed.data.gstRate !== undefined ? { taxRate: parsed.data.gstRate } : {}),
    ...(parsed.data.taxRate !== undefined && parsed.data.gstRate === undefined ? { gstRate: parsed.data.taxRate } : {}),
  }
  const product = await Product.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    updates,
    { new: true }
  ).lean()
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: product })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'inventory')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  await Product.findOneAndUpdate({ _id: id, tenantId: ctx.tenantId }, { active: false })
  return NextResponse.json({ success: true })
}
