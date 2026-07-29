import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/tenant'
import { getTenantFeatures, setTenantFeature } from '@/lib/features'
import { z } from 'zod'
import { ALL_FEATURE_KEYS } from '@/types/features'

const bulkUpdateSchema = z.object({
  features: z.record(z.enum(ALL_FEATURE_KEYS as [string, ...string[]]), z.boolean()),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  await connectDB()
  const { tenantId } = await params
  const features = await getTenantFeatures(tenantId)
  return NextResponse.json({ data: features })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const parsed = bulkUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const { tenantId } = await params
  await Promise.all(
    Object.entries(parsed.data.features).map(([key, enabled]) =>
      setTenantFeature(tenantId, key as any, enabled, ctx.userId)
    )
  )

  const updated = await getTenantFeatures(tenantId)
  return NextResponse.json({ data: updated })
}
