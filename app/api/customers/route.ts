import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasFeature } from '@/lib/features'
import { Customer } from '@/models/Customer'
import { customerSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'crm')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  await connectDB()
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 20))
  const search = searchParams.get('search') ?? ''

  const filter: Record<string, unknown> = { tenantId: ctx.tenantId }
  if (search) filter.name = { $regex: search, $options: 'i' }

  const [data, total] = await Promise.all([
    Customer.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
    Customer.countDocuments(filter),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'crm')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = customerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const customer = await Customer.create({ ...parsed.data, tenantId: ctx.tenantId })
  return NextResponse.json({ data: customer }, { status: 201 })
}
