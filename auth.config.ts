import type { NextAuthConfig } from 'next-auth'
import { UserRole } from './models/User'

// Edge-safe config — no Node.js-only imports (no mongoose, bcryptjs, etc.)
// Used by middleware. Full auth config (with Credentials provider) is in lib/auth.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [], // providers are added in lib/auth.ts (Node.js only)
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user
      const onDashboard = nextUrl.pathname.startsWith('/dashboard')
      const onAuth =
        nextUrl.pathname === '/login' || nextUrl.pathname === '/register'

      if (onDashboard && !isLoggedIn) return false
      if (onAuth && isLoggedIn)
        return Response.redirect(new URL('/dashboard', nextUrl))
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: string }).role
        token.tenantId = (user as { tenantId: string | null }).tenantId
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as UserRole
      session.user.tenantId = token.tenantId as string | null
      return session
    },
  },
}
