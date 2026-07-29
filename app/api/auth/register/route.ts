import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Tenant } from '@/models/Tenant'
import { User } from '@/models/User'
import { registerSchema } from '@/lib/validations'
import { slugify } from '@/lib/utils'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { businessName, name, email, password } = parsed.data

  await connectDB()

  const emailTaken = await User.findOne({ email })
  if (emailTaken) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const slug = slugify(businessName)
  let finalSlug = slug
  const slugExists = await Tenant.findOne({ slug })
  if (slugExists) {
    finalSlug = `${slug}-${Date.now().toString(36)}`
  }

  const tenant = await Tenant.create({ slug: finalSlug, name: businessName })
  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ tenantId: tenant._id, name, email, passwordHash, role: 'store_admin' })

  return NextResponse.json({ success: true }, { status: 201 })
}
