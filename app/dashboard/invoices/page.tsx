'use client'
import useSWR, { mutate } from 'swr'
import { Table } from '@/components/ui/Table'
import { Badge, invoiceStatusBadge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { LockedPage } from '@/components/LockedPage'
import { Send, Eye, CheckCircle2, RotateCcw, Trash } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface InvoiceRow {
  _id: string
  invoiceNo: string
  customerId?: { name: string } | null
  customerSnapshot?: { name: string } | null
  total: number
  status: string
  createdAt: string
}

export default function InvoicesPage() {
  const { data, isLoading } = useSWR('/api/invoices?limit=50', fetcher)
  const invoices = (data?.data ?? []) as InvoiceRow[]

  async function sendInvoice(id: string) {
    await fetch(`/api/invoices/${id}/send`, { method: 'POST' })
    mutate('/api/invoices?limit=50')
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Are you sure you want to delete this invoice?')) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    mutate('/api/invoices?limit=50')
  }

  async function togglePaidStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === 'paid' ? 'sent' : 'paid'
    await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    mutate('/api/invoices?limit=50')
  }

  return (
    <FeatureGate feature="invoicing" fallback={<LockedPage feature="Invoicing" />}>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
        </div>

        <Table
          columns={[
            { key: 'invoiceNo',from:'invoice', label: 'Invoice #' },
            { key: 'customerId',from:'invoice', label: 'Customer', render: (_, row) =>
              row.customerId?.name ?? row.customerSnapshot?.name ?? '—'
            },
            { key: 'total', from:'invoice', label: 'Amount', render: (v) => formatCurrency(v) },
            { key: 'status', from:'invoice', label: 'Status', render: (v) => (
              <Badge variant={invoiceStatusBadge(v)}>{v}</Badge>
            )},
            { key: 'createdAt',from:'invoice', label: 'Date', render: (v) => formatDate(v) },
            { key: '_id',from:'invoice', label: '', render: (id, row) => (
              <div className="flex gap-2">
                <Link className="flex cursor-pointer" href={`/dashboard/invoices/${id}`} prefetch={false}>
                  <button className="text-gray-400 hover:text-indigo-600"><Eye size={18} /></button>
                </Link>
                {row.status === 'draft' && (
                  <button onClick={() => sendInvoice(id)} className="text-gray-400 hover:text-green-600" title="Send invoice">
                    <Send size={14} />
                  </button>
                )}
                <button
                  onClick={() => togglePaidStatus(id, row.status)}
                  className={row.status === 'paid' ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-indigo-600'}
                  title={row.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                >
                  {row.status === 'paid' ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                </button>
                <button
                  onClick={() => deleteInvoice(id)}
                  className="flex cursor-pointer text-gray-400 hover:text-red-600"
                >
                  <Trash size={14} />
                </button>
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


