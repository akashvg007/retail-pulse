import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Product } from '@/models/Product'
import { normalizeImportRow, type ProductImportPayload } from '@/lib/inventory-import'

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'inventory')
  if (denied) return denied

  const body = await req.json()
  const products = Array.isArray(body?.products) ? (body.products as Array<Record<string, unknown>>) : []
  const normalizedProducts: ProductImportPayload[] = []

  for (const product of products) {
    const normalized = normalizeImportRow(product)
    if (normalized) normalizedProducts.push(normalized)
  }

  if (!normalizedProducts.length) {
    return NextResponse.json({ error: 'No valid inventory rows were provided.' }, { status: 400 })
  }

  await connectDB()

  const created = await Promise.all(
    normalizedProducts.map((product) =>
      Product.create({ ...product, tenantId: ctx.tenantId, active: true })
    )
  )

  return NextResponse.json({ count: created.length, data: created }, { status: 201 })
}
