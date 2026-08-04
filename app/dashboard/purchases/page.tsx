'use client'
import { useMemo, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { FeatureGate } from '@/components/FeatureGate'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import ModalFooter from '@/components/ModalFooter'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, Send, CheckCircle2, PackageCheck, XCircle } from 'lucide-react'

type PurchaseStatus = 'draft' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled'

interface PurchaseItemForm {
  name: string
  qty: number
  unitCost: number
  taxRate: number
}

interface SupplierOption {
  _id: string
  name: string
  code: string
}

interface PurchaseRow {
  _id: string
  poNo: string
  supplierSnapshot: { name: string; code: string }
  total: number
  subtotal: number
  taxAmount: number
  paymentStatus: string
  status: PurchaseStatus
  createdAt: string
  expectedDeliveryDate?: string
  items: Array<{ name: string; qty: number }>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PurchasesPage() {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseItemForm[]>([{ name: '', qty: 1, unitCost: 0, taxRate: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const purchasesQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: '10', page: String(page) })
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    return `/api/purchases?${params.toString()}`
  }, [page, search, status])

  const { data, isLoading } = useSWR(purchasesQuery, fetcher)
  const { data: suppliersResponse } = useSWR('/api/suppliers?limit=100', fetcher)
  const purchases = useMemo(() => ((data?.data ?? []) as PurchaseRow[]), [data?.data])
  const suppliers = (suppliersResponse?.data ?? []) as SupplierOption[]
  const total = Number(data?.total ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / 10))
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1]
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
    if (page <= 3) return [1, 2, 3, 4, totalPages]
    if (page >= totalPages - 2) return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, page - 1, page, page + 1, totalPages]
  }, [page, totalPages])

  const metrics = useMemo(() => {
    const draftCount = purchases.filter((purchase) => purchase.status === 'draft').length
    const sentCount = purchases.filter((purchase) => purchase.status === 'sent').length
    const receivedCount = purchases.filter((purchase) => purchase.status === 'received').length
    const totalValue = purchases.reduce((sum, purchase) => sum + Number(purchase.total ?? 0), 0)
    return { draftCount, sentCount, receivedCount, totalValue }
  }, [purchases])

  function resetForm() {
    setSupplierId('')
    setExpectedDeliveryDate('')
    setNotes('')
    setItems([{ name: '', qty: 1, unitCost: 0, taxRate: 0 }])
    setError(null)
  }

  function openCreate() {
    resetForm()
    setOpen(true)
  }

  function updateItem(index: number, field: keyof PurchaseItemForm, value: string) {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      if (field === 'name') return { ...item, name: value }
      const numericValue = Number(value)
      return { ...item, [field]: Number.isNaN(numericValue) ? 0 : numericValue }
    }))
  }

  function addItem() {
    setItems((current) => [...current, { name: '', qty: 1, unitCost: 0, taxRate: 0 }])
  }

  function removeItem(index: number) {
    setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function createPurchaseOrder() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        items: items.map((item) => ({
          ...item,
          total: item.qty * item.unitCost + (item.qty * item.unitCost * item.taxRate) / 100,
        })),
      }

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error?.formErrors?.[0] || result?.error || 'Unable to create purchase order')
      }

      mutate(purchasesQuery)
      setOpen(false)
      resetForm()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create purchase order')
    } finally {
      setSaving(false)
    }
  }

  async function runAction(id: string, action: 'approve' | 'send' | 'receive' | 'cancel') {
    setActioningId(id)
    setError(null)
    try {
      const response = await fetch(`/api/purchases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to update purchase order')
      }
      mutate(purchasesQuery)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update purchase order')
    } finally {
      setActioningId(null)
    }
  }

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <FeatureGate feature="purchase_management" fallback={<LockedPage />}>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Purchases</h1>
            <p className="mt-1 text-sm text-gray-500">Create purchase orders, progress them through status changes, and track live procurement totals.</p>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus size={14} /> New purchase order
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Page total" value={formatCurrency(metrics.totalValue)} helper="Current page PO value" />
          <StatCard label="Draft" value={String(metrics.draftCount)} helper="Awaiting approval" />
          <StatCard label="Sent" value={String(metrics.sentCount)} helper="Issued to suppliers" />
          <StatCard label="Received" value={String(metrics.receivedCount)} helper="Completed receipts" />
        </div>

        <form onSubmit={onSearchSubmit} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by PO number or supplier"
              className="pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value)
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setStatus('')
              setPage(1)
            }}
          >
            Clear
          </Button>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Table
          columns={[
            { key: 'poNo', from: 'purchase', label: 'PO #' },
            {
              key: 'supplierSnapshot',
              from: 'purchase',
              label: 'Supplier',
              render: (value) => (
                <div>
                  <p className="font-medium text-gray-900">{value?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{value?.code ?? ''}</p>
                </div>
              ),
            },
            {
              key: 'items',
              from: 'purchase',
              label: 'Items',
              render: (value) => `${value?.length ?? 0} item${(value?.length ?? 0) === 1 ? '' : 's'}`,
            },
            { key: 'total', from: 'purchase', label: 'Total', render: (value) => formatCurrency(value) },
            {
              key: 'status',
              from: 'purchase',
              label: 'Status',
              render: (value) => <Badge variant={purchaseStatusBadge(value)}>{formatStatus(value)}</Badge>,
            },
            {
              key: 'paymentStatus',
              from: 'purchase',
              label: 'Payable',
              render: (value) => <Badge variant={paymentStatusBadge(value)}>{formatStatus(value)}</Badge>,
            },
            {
              key: 'expectedDeliveryDate',
              from: 'purchase',
              label: 'Expected',
              render: (value) => value ? formatDate(value) : '—',
            },
            {
              key: '_id',
              from: 'purchase',
              label: '',
              render: (id, row) => <RowActions row={row} onAction={runAction} busyId={actioningId} />,
            },
          ]}
          data={purchases}
          emptyMessage={isLoading ? 'Loading…' : 'No purchase orders found.'}
        />

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
          <span>
            Showing page {page} of {totalPages} • {total} purchase orders total
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </Button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`h-8 w-8 rounded-md border text-sm ${pageNumber === page ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {pageNumber}
              </button>
            ))}
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create purchase order">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Supplier</label>
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name} ({supplier.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Expected delivery"
              type="date"
              value={expectedDeliveryDate}
              onChange={(event) => setExpectedDeliveryDate(event.target.value)}
            />
            <Input
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Line items</p>
              <Button type="button" size="sm" variant="secondary" onClick={addItem}>Add item</Button>
            </div>
            {items.map((item, index) => {
              const lineTotal = item.qty * item.unitCost + (item.qty * item.unitCost * item.taxRate) / 100
              return (
                <div key={`item-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Item name"
                      value={item.name}
                      onChange={(event) => updateItem(index, 'name', event.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        label="Qty"
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(event) => updateItem(index, 'qty', event.target.value)}
                      />
                      <Input
                        label="Unit cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(event) => updateItem(index, 'unitCost', event.target.value)}
                      />
                      <Input
                        label="Tax %"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.taxRate}
                        onChange={(event) => updateItem(index, 'taxRate', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Line total</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{formatCurrency(lineTotal)}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-3 text-sm text-indigo-900">
            Order total: {formatCurrency(items.reduce((sum, item) => sum + item.qty * item.unitCost + (item.qty * item.unitCost * item.taxRate) / 100, 0))}
          </div>

          <ModalFooter
            primaryButton={{
              label: saving ? 'Creating…' : 'Create purchase order',
              onClick: createPurchaseOrder,
              disabled: saving,
            }}
            secondaryButton={{ label: 'Cancel', onClick: () => setOpen(false) }}
          />
        </div>
      </Modal>
    </FeatureGate>
  )
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{helper}</p>
    </div>
  )
}

function RowActions({
  row,
  onAction,
  busyId,
}: {
  row: PurchaseRow
  onAction: (id: string, action: 'approve' | 'send' | 'receive' | 'cancel') => Promise<void>
  busyId: string | null
}) {
  const disabled = busyId === row._id
  return (
    <div className="flex gap-2">
      {row.status === 'draft' ? (
        <button disabled={disabled} onClick={() => onAction(row._id, 'approve')} className="text-gray-400 hover:text-green-600 disabled:opacity-40" title="Approve">
          <CheckCircle2 size={14} />
        </button>
      ) : null}
      {['draft', 'approved'].includes(row.status) ? (
        <button disabled={disabled} onClick={() => onAction(row._id, 'send')} className="text-gray-400 hover:text-indigo-600 disabled:opacity-40" title="Send">
          <Send size={14} />
        </button>
      ) : null}
      {['approved', 'sent', 'partially_received'].includes(row.status) ? (
        <button disabled={disabled} onClick={() => onAction(row._id, 'receive')} className="text-gray-400 hover:text-emerald-600 disabled:opacity-40" title="Mark received">
          <PackageCheck size={14} />
        </button>
      ) : null}
      {!['received', 'cancelled'].includes(row.status) ? (
        <button disabled={disabled} onClick={() => onAction(row._id, 'cancel')} className="text-gray-400 hover:text-red-600 disabled:opacity-40" title="Cancel">
          <XCircle size={14} />
        </button>
      ) : null}
    </div>
  )
}

function purchaseStatusBadge(status: PurchaseStatus) {
  const map: Record<PurchaseStatus, 'gray' | 'yellow' | 'blue' | 'green' | 'red'> = {
    draft: 'gray',
    approved: 'yellow',
    sent: 'blue',
    partially_received: 'yellow',
    received: 'green',
    cancelled: 'red',
  }
  return map[status] ?? 'gray'
}

function paymentStatusBadge(status: string) {
  const map: Record<string, 'gray' | 'yellow' | 'green'> = {
    unpaid: 'gray',
    partially_paid: 'yellow',
    paid: 'green',
  }
  return map[status] ?? 'gray'
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ')
}

function LockedPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-4xl">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">Purchase Management is not enabled</h2>
      <p className="mt-2 max-w-sm text-gray-500">Contact your administrator to enable this feature for your account.</p>
    </div>
  )
}