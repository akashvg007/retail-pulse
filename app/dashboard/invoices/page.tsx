'use client'
import useSWR, { mutate } from 'swr'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge, invoiceStatusBadge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { Plus, Send, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function InvoicesPage() {
  const { data, isLoading } = useSWR('/api/invoices?limit=50', fetcher)
  const invoices = data?.data ?? []

  async function sendInvoice(id: string) {
    await fetch(`/api/invoices/${id}/send`, { method: 'POST' })
    mutate('/api/invoices?limit=50')
  }

  return (
    <FeatureGate feature="invoicing" fallback={<LockedPage />}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
          <Link href="/dashboard/invoices/new">
            <Button size="sm"><Plus size={14} /> New invoice</Button>
          </Link>
        </div>

        <Table
          columns={[
            { key: 'invoiceNo', label: 'Invoice #' },
            { key: 'customerId', label: 'Customer', render: (v, row) =>
              row.customerId?.name ?? row.customerSnapshot?.name ?? '—'
            },
            { key: 'total', label: 'Amount', render: (v) => formatCurrency(v) },
            { key: 'status', label: 'Status', render: (v) => (
              <Badge variant={invoiceStatusBadge(v)}>{v}</Badge>
            )},
            { key: 'createdAt', label: 'Date', render: (v) => formatDate(v) },
            { key: '_id', label: '', render: (id, row) => (
              <div className="flex gap-2">
                <Link href={`/dashboard/invoices/${id}`}>
                  <button className="text-gray-400 hover:text-indigo-600"><Eye size={14} /></button>
                </Link>
                {row.status === 'draft' && (
                  <button onClick={() => sendInvoice(id)} className="text-gray-400 hover:text-green-600">
                    <Send size={14} />
                  </button>
                )}
              </div>
            )},
          ]}
          data={invoices}
          emptyMessage={isLoading ? 'Loading…' : 'No invoices yet.'}
        />
      </div>
    </FeatureGate>
  )
}

function LockedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">Invoicing is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">Contact your administrator to enable this feature.</p>
    </div>
  )
}
