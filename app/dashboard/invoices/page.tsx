'use client'
import useSWR, { mutate } from 'swr'
import { Table } from '@/components/ui/Table'
import { Badge, invoiceStatusBadge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { LockedPage } from '@/components/LockedPage'
import { Send, Eye, CheckCircle2, RotateCcw, Trash, MoreVertical } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface InvoiceRow {
  _id: string
  invoiceNo: string
  customerId?: { name: string } | null
  customerSnapshot?: { name: string } | null
  total: number
  status: string
  createdAt: string
  inventoryDeductedAt?: string
  refundedAt?: string
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
  const invoicesKey = `/api/invoices?limit=50${searchParam}`
  const { data, isLoading } = useSWR(invoicesKey, fetcher)
  const invoices = (data?.data ?? []) as InvoiceRow[]

  async function sendInvoice(id: string) {
    await fetch(`/api/invoices/${id}/send`, { method: 'POST' })
    mutate(invoicesKey)
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Are you sure you want to delete this invoice?')) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    mutate(invoicesKey)
  }

  async function togglePaidStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === 'paid' ? 'sent' : 'paid'
    await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    mutate(invoicesKey)
  }

  async function refundInvoice(id: string) {
    if (!confirm('Return this invoice and add its items back to inventory?')) return

    const response = await fetch(`/api/invoices/${id}/refund`, { method: 'POST' })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      alert(result.error ?? 'Unable to return this invoice')
      return
    }
    mutate(invoicesKey)
  }

  return (
    <FeatureGate feature="invoicing" fallback={<LockedPage feature="Invoicing" />}>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
          <Input
            aria-label="Search invoices"
            className="sm:w-72"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoice number or customer"
            type="search"
            value={search}
          />
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
              <div className="relative flex justify-end">
                <button
                  aria-expanded={openMenuId === id}
                  aria-haspopup="menu"
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                  title="Invoice actions"
                  type="button"
                >
                  <MoreVertical size={18} />
                </button>
                {openMenuId === id && (
                  <div
                    aria-label="Invoice actions"
                    className="absolute right-0 top-8 z-10 min-w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
                    role="menu"
                  >
                    <Link
                      className="flex items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      href={`/dashboard/invoices/${id}`}
                      onClick={() => setOpenMenuId(null)}
                      prefetch={false}
                      role="menuitem"
                    >
                      <Eye size={14} /> View invoice
                    </Link>
                    {row.status === 'draft' && (
                      <button
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => { setOpenMenuId(null); sendInvoice(id) }}
                        role="menuitem"
                        type="button"
                      >
                        <Send size={14} /> Send invoice
                      </button>
                    )}
                    <button
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => { setOpenMenuId(null); togglePaidStatus(id, row.status) }}
                      role="menuitem"
                      type="button"
                    >
                      {row.status === 'paid' ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                      {row.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                    </button>
                    {row.inventoryDeductedAt && !row.refundedAt && (
                      <button
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => { setOpenMenuId(null); refundInvoice(id) }}
                        role="menuitem"
                        type="button"
                      >
                        <RotateCcw size={14} /> Return / refund
                      </button>
                    )}
                    <button
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      onClick={() => { setOpenMenuId(null); deleteInvoice(id) }}
                      role="menuitem"
                      type="button"
                    >
                      <Trash size={14} /> Delete invoice
                    </button>
                  </div>
                )}
              </div>
            )},
          ]}
          data={invoices}
          isLoading={isLoading}
          emptyMessage="No invoices yet."
        />
      </div>
    </FeatureGate>
  )
}


