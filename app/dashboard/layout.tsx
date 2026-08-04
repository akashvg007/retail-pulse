import { auth } from '@/lib/auth'
import { getTenantFeatures } from '@/lib/features'
import { FeatureProvider } from '@/contexts/FeatureContext'
import { Sidebar } from '@/components/Sidebar'
import { redirect } from 'next/navigation'
import type { TenantFeaturesMap } from '@/lib/features'
import { ALL_FEATURE_KEYS } from '@/types/features'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let features: TenantFeaturesMap
  if (session.user.role === 'super_admin') {
    // Super admin always has all features
    features = Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, true])) as TenantFeaturesMap
  } else {
    features = await getTenantFeatures(session.user.tenantId!)
  }

  return (
    <FeatureProvider features={features}>
      <div className="min-h-screen bg-slate-50 lg:flex">
        <div className="print:hidden"><Sidebar session={session} /></div>
        <main className="min-w-0 flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </FeatureProvider>
  )
}
