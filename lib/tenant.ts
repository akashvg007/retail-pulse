import { auth } from './auth'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/models/User'

export interface SessionContext {
  userId: string
  tenantId: string
  role: UserRole
}

export async function requireAuth(): Promise<SessionContext | NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId ?? '',
    role: session.user.role,
  }
}

export async function requireSuperAdmin(): Promise<SessionContext | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result
  if (result.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return result
}

export function isSuperAdmin(role: UserRole) {
  return role === 'super_admin'
}
