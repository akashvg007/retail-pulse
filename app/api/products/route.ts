import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Product } from '@/models/Product'
import { productSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  // const denied = await requireFeature(ctx, 'inventory')
  // if (denied) return denied

  await connectDB()
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(500, Number(searchParams.get('limit') ?? 20))
  const search = searchParams.get('search') ?? ''

  const filter: Record<string, unknown> = { tenantId: ctx.tenantId, active: true }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ]
  }

  const [data, total] = await Promise.all([
    Product.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
    Product.countDocuments(filter),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'inventory')
  if (denied) return denied

  const body = await req.json()
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()
  const product = await Product.create({ ...parsed.data, tenantId: ctx.tenantId })
  return NextResponse.json({ data: product }, { status: 201 })
}
