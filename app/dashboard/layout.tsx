import { auth } from '@/lib/auth'
import { getStaffFeatures, getTenantFeatures } from '@/lib/features'
import { FeatureProvider } from '@/contexts/FeatureContext'
import { Sidebar } from '@/components/Sidebar'
import { redirect } from 'next/navigation'
import type { TenantFeaturesMap } from '@/lib/features'
import { ALL_FEATURE_KEYS } from '@/types/features'
import { connectDB } from '@/lib/db'
import { Tenant } from '@/models/Tenant'

function LockedPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Access restricted</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your tenant is currently suspended. Please contact your administrator.
        </p>
      </div>
    </div>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let features: TenantFeaturesMap
  if (session.user.role === 'super_admin') {
    features = Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, true])) as TenantFeaturesMap
  } else {
    if (!session.user.tenantId) return <LockedPage />

    await connectDB()
    // Run tenant active-check and feature loading in parallel
    const [tenant, resolvedFeatures] = await Promise.all([
      Tenant.findById(session.user.tenantId).select({ active: 1 }).lean(),
      session.user.role === 'staff' && session.user.id
        ? getStaffFeatures(session.user.id, session.user.tenantId)
        : getTenantFeatures(session.user.tenantId),
    ])
    if (!tenant?.active) return <LockedPage />
    features = resolvedFeatures
  }

  return (
    <FeatureProvider features={features}>
      <div className="min-h-screen bg-slate-50 lg:flex">
        <div className="print:hidden"><Sidebar session={session} /></div>
        <main className="min-w-0 flex-1 overflow-x-hidden h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    </FeatureProvider>
  )
}
