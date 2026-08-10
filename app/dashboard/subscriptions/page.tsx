import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Subscription } from '@/models/Subscription'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { FeatureGate } from '@/components/FeatureGate'
import { LockedPage } from '@/components/LockedPage'
import { formatDate } from '@/lib/utils'

interface SubscriptionRow {
  _id: string
  plan: string
  status: string
  startDate: string
  endDate?: string | null
  razorpaySubscriptionId?: string
}

export default async function SubscriptionsPage() {
  const session = await auth()
  const tenantId = session?.user?.tenantId

  let subscriptions: SubscriptionRow[] = []
  if (tenantId) {
    await connectDB()
    subscriptions = (await Subscription.find({ tenantId })
      .sort({ createdAt: -1 })
      .lean()) as unknown as SubscriptionRow[]
  }

  return (
    <FeatureGate feature="subscriptions" fallback={<LockedPage feature="Subscriptions" />}>
      <div className="space-y-4 p-4 sm:p-6">
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
          emptyMessage="No active subscriptions."
        />
      </div>
    </FeatureGate>
  )
}


