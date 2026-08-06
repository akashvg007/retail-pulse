import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Supplier } from '@/models/Supplier'

const supplierDraftSchema = z
  .object({
    name: z.string().min(2, 'Supplier name is required'),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    gstNumber: z.string().optional(),
  })
  .refine((value) => Boolean(value.phone?.trim() || value.email?.trim()), {
    message: 'Supplier phone or email is required',
    path: ['phone'],
  })

function sanitizeCodePart(value: string) {
  return value.replace(/[^A-Z0-9]/g, '').slice(0, 4)
}

async function generateSupplierCode(tenantId: string, supplierName: string) {
  const seed = sanitizeCodePart(supplierName.toUpperCase()) || 'SUPR'

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = String(Date.now() + attempt).slice(-6)
    const code = `${seed}${suffix}`
    const exists = await Supplier.exists({ tenantId, code })
    if (!exists) return code
  }

  return `SUP${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'purchase_bill_ocr')
  if (denied) return denied

  const body = await req.json()
  const parsed = supplierDraftSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await connectDB()

  const normalizedName = parsed.data.name.trim()
  const normalizedPhone = parsed.data.phone?.trim()
  const normalizedEmail = parsed.data.email?.trim().toLowerCase()

  const existingSupplier = await Supplier.findOne({
    tenantId: ctx.tenantId,
    $or: [
      ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      { name: normalizedName },
    ],
  })
    .select({ _id: 1, name: 1, code: 1, phone: 1, email: 1 })
    .lean()

  if (existingSupplier) {
    return NextResponse.json({ data: existingSupplier, existing: true })
  }

  const code = await generateSupplierCode(ctx.tenantId, normalizedName)
  const supplier = await Supplier.create({
    tenantId: ctx.tenantId,
    code,
    name: normalizedName,
    phone: normalizedPhone || undefined,
    email: normalizedEmail || undefined,
    gstNumber: parsed.data.gstNumber?.trim() || undefined,
    notes: 'Auto-created from purchase bill OCR',
    active: true,
  })

  return NextResponse.json(
    {
      data: {
        _id: supplier._id,
        name: supplier.name,
        code: supplier.code,
        phone: supplier.phone,
        email: supplier.email,
      },
      existing: false,
    },
    { status: 201 }
  )
}
