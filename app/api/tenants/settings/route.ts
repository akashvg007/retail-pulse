import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { Tenant } from '@/models/Tenant'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  name: z.string().trim().min(1).optional(),
  settings: z.object({
    gstNumber: z.string().optional(),
    address: z.string().optional(),
    logo: z.string().optional(),
    taxRate: z.number().optional(),
    currency: z.string().optional(),
    invoiceDisplay: z.object({
      showCompanyName: z.boolean().optional(),
      showAddress: z.boolean().optional(),
      showGstNumber: z.boolean().optional(),
      showLogo: z.boolean().optional(),
      showContactDetails: z.boolean().optional(),
      showCustomerDetails: z.boolean().optional(),
      showItemTax: z.boolean().optional(),
      showTotals: z.boolean().optional(),
      showNotes: z.boolean().optional(),
      showPaymentTerms: z.boolean().optional(),
      showFooter: z.boolean().optional(),
    }).optional(),
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
  const settings = parsed.data.settings
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(settings)) {
    if (key === 'branding' || key === 'invoiceDisplay') {
      for (const [nestedKey, nestedValue] of Object.entries(value ?? {})) {
        updates[`settings.${key}.${nestedKey}`] = nestedValue
      }
    } else if (value !== undefined) {
      updates[`settings.${key}`] = value
    }
  }
  if (parsed.data.name !== undefined) updates.name = parsed.data.name

  const tenant = await Tenant.findByIdAndUpdate(
    ctx.tenantId,
    { $set: updates },
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
  const tenant = await Tenant.findById(ctx.tenantId).select('name settings').lean()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  return NextResponse.json({ data: { ...tenant.settings, name: tenant.name } })
}
