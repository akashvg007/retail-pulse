import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasFeature } from '@/lib/features'
import { Invoice } from '@/models/Invoice'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  if (!await hasFeature(ctx.tenantId, 'invoicing')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  await connectDB()
  const { id } = await params
  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId, status: 'draft' },
    { status: 'sent' },
    { new: true }
  ).lean()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found or already sent' }, { status: 404 })
  return NextResponse.json({ data: invoice })
}
