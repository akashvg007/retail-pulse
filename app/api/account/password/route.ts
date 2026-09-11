import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { User } from '@/models/User'

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
})

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = passwordChangeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const user = await User.findById(auth.userId).select('+passwordHash')
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const currentPasswordMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!currentPasswordMatches) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await user.save()

  return NextResponse.json({ success: true })
}