import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { connectDB } from './db'
import { User } from '@/models/User'
import { Tenant } from '@/models/Tenant'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authConfig } from '@/auth.config'

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        await connectDB()
        const user = await User.findOne({
          email: parsed.data.email,
          active: true,
        }).lean()
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        if (user.role !== 'super_admin') {
          if (!user.tenantId) return null
          const tenant = await Tenant.findById(user.tenantId).select({ active: 1 }).lean()
          if (!tenant?.active) return null
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId?.toString() ?? null,
        }
      },
    }),
  ],
})
