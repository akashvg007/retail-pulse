import NextAuth from 'next-auth'
import type { UserRole } from '@/models/User'

declare module 'next-auth' {
  interface User {
    role: UserRole
    tenantId: string | null
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role: UserRole
      tenantId: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    tenantId: string | null
  }
}
