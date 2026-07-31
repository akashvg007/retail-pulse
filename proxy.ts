import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// Use the edge-safe config (no mongoose/bcryptjs) for middleware
export default NextAuth(authConfig).auth

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
