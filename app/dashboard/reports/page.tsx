import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getDashboardReportsData } from '@/lib/reports-data'
import { FeatureGate } from '@/components/FeatureGate'

export const dynamic = 'force-dynamic'

const ReportsAnalytics = dynamicImport(() => import('@/components/reports/ReportsAnalytics').then((module) => module.ReportsAnalytics), {
  loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading reports…</div>,
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
    <FeatureGate feature="reports" fallback={<LockedPage />}>
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>

        {reportData ? (
          <Suspense fallback={<div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading reports…</div>}>
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

function LockedPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-4xl">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">Reports is not enabled</h2>
      <p className="mt-2 max-w-sm text-gray-500">Contact your administrator to enable this feature.</p>
    </div>
  )
}
