import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { supplierSchema } from '@/lib/validations'
import { Supplier } from '@/models/Supplier'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'supplier_management')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  const supplier = await Supplier.findOne({ _id: id, tenantId: ctx.tenantId, active: true }).lean()
  if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: supplier })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'supplier_management')
  if (denied) return denied

  const body = await req.json()
  const parsed = supplierSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updates = {
    ...parsed.data,
    ...(parsed.data.code ? { code: parsed.data.code.trim().toUpperCase() } : {}),
  }

  await connectDB()
  const { id } = await params
  const supplier = await Supplier.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId, active: true },
    updates,
    { new: true }
  ).lean()
  if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: supplier })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'supplier_management')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  await Supplier.findOneAndUpdate({ _id: id, tenantId: ctx.tenantId }, { active: false })

  return NextResponse.json({ success: true })
}