import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasFeature } from '@/lib/features'
import { Product } from '@/models/Product'
import { productSchema } from '@/lib/validations'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'inventory')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

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
  if (!await hasFeature(ctx.tenantId, 'inventory')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = productSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const { id } = await params
  const product = await Product.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    parsed.data,
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
  if (!await hasFeature(ctx.tenantId, 'inventory')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  await connectDB()
  const { id } = await params
  await Product.findOneAndUpdate({ _id: id, tenantId: ctx.tenantId }, { active: false })
  return NextResponse.json({ success: true })
}
