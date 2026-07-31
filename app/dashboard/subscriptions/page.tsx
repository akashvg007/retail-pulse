'use client'
import useSWR from 'swr'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { FeatureGate } from '@/components/FeatureGate'
import { formatDate } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SubscriptionsPage() {
  const { data, isLoading } = useSWR('/api/subscriptions', fetcher)
  const subscriptions = data?.data ?? []

  return (
    <FeatureGate feature="subscriptions" fallback={<LockedPage />}>
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
        <Table
          columns={[
            { key: 'plan',from:'subscription', label: 'Plan' },
            { key: 'status',from:'subscription', label: 'Status', render: (v) => (
              <Badge variant={v === 'active' ? 'green' : v === 'paused' ? 'yellow' : 'red'}>{v}</Badge>
            )},
            { key: 'startDate',from:'subscription', label: 'Start Date', render: (v) => formatDate(v) },
            { key: 'endDate',from:'subscription', label: 'End Date', render: (v) => v ? formatDate(v) : '—' },
            { key: 'razorpaySubscriptionId',from:'subscription', label: 'Razorpay ID' },
          ]}
          data={subscriptions}
          emptyMessage={isLoading ? 'Loading…' : 'No active subscriptions.'}
        />
      </div>
    </FeatureGate>
  )
}

function LockedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">Subscriptions is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">Contact your administrator to enable this feature.</p>
    </div>
  )
}
