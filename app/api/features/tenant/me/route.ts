import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { getTenantFeatures } from '@/lib/features'

export async function GET() {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  if (!ctx.tenantId) {
    // Super admin has all features
    const { ALL_FEATURE_KEYS } = await import('@/types/features')
    const all = Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, true]))
    return NextResponse.json({ data: all })
  }

  await connectDB()
  const features = await getTenantFeatures(ctx.tenantId)
  return NextResponse.json({ data: features })
}
