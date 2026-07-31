import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { getTenantFeatures, getStaffFeatures } from '@/lib/features'
import { ALL_FEATURE_KEYS } from '@/types/features'

export async function GET() {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  if (!ctx.tenantId) {
    const all = Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, true]))
    return NextResponse.json({ data: all })
  }

  await connectDB()

  // Staff get the intersection of tenant features and their personal grants
  const features =
    ctx.role === 'staff'
      ? await getStaffFeatures(ctx.userId, ctx.tenantId)
      : await getTenantFeatures(ctx.tenantId)

  return NextResponse.json({ data: features })
}
