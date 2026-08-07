import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { Tenant } from '@/models/Tenant'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  settings: z.object({
    gstNumber: z.string().optional(),
    address: z.string().optional(),
    logo: z.string().optional(),
    taxRate: z.number().optional(),
    currency: z.string().optional(),
    branding: z.object({
      businessLogo: z.string().optional(),
      primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      tagline: z.string().optional(),
      paymentTerms: z.string().optional(),
      invoiceFooter: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    }).optional(),
  }),
})

export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const tenant = await Tenant.findByIdAndUpdate(
    ctx.tenantId,
    { $set: { settings: parsed.data.settings } },
    { new: true }
  ).lean()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  return NextResponse.json({ data: tenant })
}

export async function GET() {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  await connectDB()
  const tenant = await Tenant.findById(ctx.tenantId).select('settings').lean()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  return NextResponse.json({ data: tenant.settings })
}
