import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { getTenantFeatures, getStaffFeatures, setStaffFeatures } from '@/lib/features'
import { z } from 'zod'
import { ALL_FEATURE_KEYS } from '@/types/features'
import { Staff } from '@/models/Staff'

const bulkUpdateSchema = z.object({
  features: z.record(z.enum(ALL_FEATURE_KEYS as [string, ...string[]]), z.boolean()),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (ctx.role !== 'super_admin' && ctx.role !== 'store_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const { userId } = await params

  // Verify staff belongs to this tenant (super_admin can skip tenant check)
  if (ctx.role === 'store_admin') {
    const staff = await Staff.findOne({ userId, tenantId: ctx.tenantId }).lean()
    if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  const tenantId = ctx.role === 'super_admin' ? (
    // For super_admin, derive tenantId from the staff record
    (await Staff.findOne({ userId }).lean())?.tenantId.toString() ?? ctx.tenantId
  ) : ctx.tenantId

  const [tenantFeatures, staffFeatures] = await Promise.all([
    getTenantFeatures(tenantId),
    getStaffFeatures(userId, tenantId),
  ])

  return NextResponse.json({ data: { tenantFeatures, staffFeatures } })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await requireAuth()
  console.log('ctx :', ctx);
  if (ctx instanceof NextResponse) return ctx
  if (ctx.role !== 'super_admin' && ctx.role !== 'store_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = bulkUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const { userId } = await params

  const tenantId = ctx.role === 'store_admin' ? ctx.tenantId : (
    (await Staff.findOne({ userId }).lean())?.tenantId.toString() ?? ctx.tenantId
  )

  if (ctx.role === 'store_admin') {
    const staff = await Staff.findOne({ userId, tenantId }).lean()
    console.log('staff :', staff);
    if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

console.log('parsed.data.features :', parsed.data.features);
  await setStaffFeatures(userId, tenantId, parsed.data.features, ctx.userId)
  const updated = await getStaffFeatures(userId, tenantId)
  return NextResponse.json({ data: updated })
}
