import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getDashboardReportsData } from '@/lib/reports-data'
import { FeatureGate } from '@/components/FeatureGate'
import { LockedPage } from '@/components/LockedPage'
import { Skeleton } from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'

const ReportsAnalytics = dynamicImport(() => import('@/components/reports/ReportsAnalytics').then((module) => module.ReportsAnalytics), {
  loading: () => <Skeleton className="h-96 rounded-2xl bg-white" />,
})

export default async function ReportsPage() {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  const reportData = tenantId
    ? await getDashboardReportsData(tenantId, {
        dateRange: 'thisMonth',
        paymentMode: 'all',
        cashierRole: 'all',
      })
    : null

  return (
    <FeatureGate feature="reports" fallback={<LockedPage feature="Reports" />}>
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>

        {reportData ? (
          <Suspense fallback={<Skeleton className="h-96 rounded-2xl bg-white" />}>
            <ReportsAnalytics reportData={reportData} />
          </Suspense>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No tenant context is available yet, so reporting data cannot be loaded.
          </div>
        )}
      </div>
    </FeatureGate>
  )
}


