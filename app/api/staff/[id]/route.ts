import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasFeature } from '@/lib/features'
import { Staff } from '@/models/Staff'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'staff_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const body = await req.json()
  await connectDB()
  const { id } = await params
  const staff = await Staff.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    { department: body.department, permissions: body.permissions },
    { new: true }
  ).populate('userId', 'name email').lean()

  if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: staff })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'staff_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  await connectDB()
  const { id } = await params
  await Staff.findOneAndUpdate({ _id: id, tenantId: ctx.tenantId }, { active: false })
  return NextResponse.json({ success: true })
}
