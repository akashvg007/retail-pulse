import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireSuperAdmin, isSuperAdmin } from '@/lib/tenant'
import { Tenant } from '@/models/Tenant'
import { TenantFeature } from '@/models/TenantFeature'
import { User } from '@/models/User'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { slugify } from '@/lib/utils'

const createTenantSchema = z.object({
  name: z.string().min(2),
  plan: z.enum(['basic', 'pro', 'enterprise']).default('basic'),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  settings: z.object({
    gstNumber: z.string().optional(),
    address: z.string().optional(),
    taxRate: z.number().default(18),
    currency: z.string().default('INR'),
    branding: z.object({
      businessLogo: z.string().optional(), // base64 or URL
      primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      tagline: z.string().optional(),
      paymentTerms: z.string().optional(),
      invoiceFooter: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    }).optional(),
  }).optional(),
})

export async function GET() {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  await connectDB()
  const tenants = await Tenant.find().sort({ createdAt: -1 }).lean()
  return NextResponse.json({ data: tenants })
}

export async function POST(req: NextRequest) {
  const ctx = await requireSuperAdmin()
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const parsed = createTenantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, plan, adminName, adminEmail, adminPassword, settings } = parsed.data

  await connectDB()

  const slug = slugify(name)
  const existing = await Tenant.findOne({ slug })
  if (existing) {
    return NextResponse.json({ error: 'A tenant with this name already exists' }, { status: 409 })
  }

  const emailTaken = await User.findOne({ email: adminEmail })
  if (emailTaken) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const tenant = await Tenant.create({
    slug,
    name,
    plan,
    settings: settings || {
      taxRate: 18,
      currency: 'INR',
    },
  })

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  await User.create({
    tenantId: tenant._id,
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: 'store_admin',
  })

  return NextResponse.json({ data: tenant }, { status: 201 })
}
