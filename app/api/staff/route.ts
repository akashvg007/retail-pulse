import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasFeature } from '@/lib/features'
import { User } from '@/models/User'
import { Staff } from '@/models/Staff'
import { staffSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'staff_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  await connectDB()
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 20))

  const staffList = await Staff.find({ tenantId: ctx.tenantId, active: true })
    .populate('userId', 'name email role active')
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  const total = await Staff.countDocuments({ tenantId: ctx.tenantId, active: true })
  return NextResponse.json({ data: staffList, total, page, limit })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'staff_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = staffSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()

  const existing = await User.findOne({ email: parsed.data.email })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await User.create({
    tenantId: ctx.tenantId,
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: 'staff',
  })

  const staff = await Staff.create({
    tenantId: ctx.tenantId,
    userId: user._id,
    department: parsed.data.department,
    permissions: parsed.data.permissions,
  })

  return NextResponse.json({ data: { ...staff.toObject(), user } }, { status: 201 })
}
