import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Staff } from '@/models/Staff'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'staff_management')
  if (denied) return denied

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
  const denied2 = await requireFeature(ctx, 'staff_management')
  if (denied2) return denied2

  await connectDB()
  const { id } = await params
  await Staff.findOneAndUpdate({ _id: id, tenantId: ctx.tenantId }, { active: false })
  return NextResponse.json({ success: true })
}
