import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/tenant'
import { FeatureFlag } from '@/models/FeatureFlag'
import { z } from 'zod'
import { ALL_FEATURE_KEYS } from '@/types/features'

const updateFlagSchema = z.object({
  key: z.enum(ALL_FEATURE_KEYS as [string, ...string[]]),
  globalEnabled: z.boolean().optional(),
  beta: z.boolean().optional(),
})

export async function GET() {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  await connectDB()
  const flags = await FeatureFlag.find().sort({ key: 1 }).lean()
  return NextResponse.json({ data: flags })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const parsed = updateFlagSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const { key, ...updates } = parsed.data
  const flag = await FeatureFlag.findOneAndUpdate({ key }, updates, { new: true }).lean()
  if (!flag) return NextResponse.json({ error: 'Feature not found' }, { status: 404 })

  return NextResponse.json({ data: flag })
}
