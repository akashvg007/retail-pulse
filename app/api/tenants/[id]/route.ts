import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/tenant'
import { Tenant } from '@/models/Tenant'
import { z } from 'zod'

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  plan: z.enum(['basic', 'pro', 'enterprise']).optional(),
  active: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  await connectDB()
  const { id } = await params
  const tenant = await Tenant.findById(id).lean()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: tenant })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const parsed = updateTenantSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const { id } = await params
  const tenant = await Tenant.findByIdAndUpdate(id, parsed.data, { new: true }).lean()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: tenant })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  await connectDB()
  const { id } = await params
  await Tenant.findByIdAndUpdate(id, { active: false })
  return NextResponse.json({ success: true })
}
