import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { supplierSchema } from '@/lib/validations'
import { Supplier } from '@/models/Supplier'

export async function GET(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'supplier_management')
  if (denied) return denied

  await connectDB()
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 20))
  const search = searchParams.get('search')?.trim() ?? ''

  const filter: Record<string, unknown> = { tenantId: ctx.tenantId, active: true }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ]
  }

  const [data, total] = await Promise.all([
    Supplier.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
    Supplier.countDocuments(filter),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'supplier_management')
  if (denied) return denied

  const body = await req.json()
  const parsed = supplierSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()

  const supplier = await Supplier.create({
    ...parsed.data,
    code: parsed.data.code.trim().toUpperCase(),
    tenantId: ctx.tenantId,
  })

  return NextResponse.json({ data: supplier }, { status: 201 })
}