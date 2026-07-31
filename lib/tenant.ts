import { auth } from './auth'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/models/User'
import { hasFeature, type TenantFeaturesMap } from './features'
import type { FeatureKey } from '@/types/features'

export interface SessionContext {
  userId: string
  tenantId: string
  name?: string
  role: UserRole
}

export async function requireAuth(): Promise<SessionContext | NextResponse> {
  const session = await auth()
  console.log("session ==> ", session);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return {
    userId: session.user.id,
    name: session?.user?.name || 'staff1',
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

/** Single enforcement point for all 3 feature layers. Returns 403 response or null. */
export async function requireFeature(
  ctx: SessionContext,
  key: FeatureKey
): Promise<NextResponse | null> {
  const allowed = await hasFeature(ctx.tenantId, key, { userId: ctx.userId, role: ctx.role })
  if (!allowed) return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  return null
}
