'use client'
import useSWR from 'swr'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { formatCurrency, formatDate } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PaymentsPage() {
  const { data, isLoading } = useSWR('/api/invoices?status=paid&limit=50', fetcher)
  const invoices = data?.data ?? []

  return (
    <FeatureGate feature="payments" fallback={<LockedPage />}>
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Payments</h1>
        <Table
          columns={[
            { key: 'invoiceNo', label: 'Invoice #' },
            { key: 'customerId', label: 'Customer', render: (v, row) =>
              row.customerId?.name ?? row.customerSnapshot?.name ?? '—'
            },
            { key: 'total', label: 'Amount', render: (v) => formatCurrency(v) },
            { key: 'status', label: 'Status', render: () => <Badge variant="green">Paid</Badge> },
            { key: 'updatedAt', label: 'Date', render: (v) => formatDate(v) },
          ]}
          data={invoices}
          emptyMessage={isLoading ? 'Loading…' : 'No payments recorded yet.'}
        />
      </div>
    </FeatureGate>
  )
}

function LockedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">Payments is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">Contact your administrator to enable this feature.</p>
    </div>
  )
}
