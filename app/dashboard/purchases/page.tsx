'use client'
import { useMemo, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { FeatureGate } from '@/components/FeatureGate'
import { LockedPage } from '@/components/LockedPage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import ModalFooter from '@/components/ModalFooter'
import BillImageInput from '@/components/purchases/BillImageInput'
import OcrReviewPanel from '@/components/purchases/OcrReviewPanel'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { OcrExtractedData } from '@/lib/ocr/types'
import { OCR_AUTOFILL_CONFIDENCE_THRESHOLD } from '@/lib/ocr/types'
import { useFeature } from '@/contexts/FeatureContext'
import { Plus, Search, Send, CheckCircle2, PackageCheck, XCircle, Eye, Boxes } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

type PurchaseStatus = 'draft' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled'

interface SupplierOption {
  _id: string
  name: string
  code: string
  phone?: string
  email?: string
}

interface PurchaseItemForm {
  productId?: string
  name: string
  hsnCode: string
  qty: number
  unitCost: number
  discountPercentage: number
  discountAmount: number
  taxRate: number
  mrp: number
  mrpDiscount: number
  price: number
}

interface ProductOption {
  _id: string
  name: string
  hsnCode?: string
  gstRate?: number
  taxRate?: number
}

interface PurchaseRow {
  _id: string
  poNo: string
  supplierSnapshot: { name: string; code: string }
  invoiceNo: string
  invoiceDate: string
  paymentTerms: string
  total: number
  subtotal: number
  taxAmount: number
  paymentStatus: string
  status: PurchaseStatus
  createdAt: string
  expectedDeliveryDate?: string
  inventoryPostedAt?: string
  items: Array<{ name: string; hsnCode?: string; qty: number; unitCost?: number; discountPercentage?: number; discountAmount?: number; taxRate?: number; mrp?: number; mrpDiscount?: number; price?: number; total?: number }>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PurchasesPage() {
  const billOcrEnabled = useFeature('purchase_bill_ocr')
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Cash')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseItemForm[]>([createEmptyItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStage, setOcrStage] = useState('Preparing OCR engine')
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrFileName, setOcrFileName] = useState<string | null>(null)
  const [ocrData, setOcrData] = useState<OcrExtractedData | null>(null)
  const [creatingSupplierDraft, setCreatingSupplierDraft] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRow | null>(null)

  const purchasesQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: '10', page: String(page) })
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    return `/api/purchases?${params.toString()}`
  }, [page, search, status])

  const { data, isLoading } = useSWR(purchasesQuery, fetcher)
  const { data: suppliersResponse } = useSWR('/api/suppliers?limit=100', fetcher)
  const { data: productsResponse } = useSWR('/api/products?limit=500', fetcher)
  const purchases = useMemo(() => ((data?.data ?? []) as PurchaseRow[]), [data?.data])
  const suppliers = (suppliersResponse?.data ?? []) as SupplierOption[]
  const products = (productsResponse?.data ?? []) as ProductOption[]
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
    setInvoiceNo('')
    setInvoiceDate('')
    setPaymentTerms('Cash')
    setExpectedDeliveryDate('')
    setNotes('')
    setItems([createEmptyItem()])
    setOcrBusy(false)
    setOcrProgress(0)
    setOcrStage('Preparing OCR engine')
    setOcrError(null)
    setOcrFileName(null)
    setOcrData(null)
    setCreatingSupplierDraft(false)
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
      const nextValue = Number.isNaN(numericValue) ? 0 : numericValue
      if (field === 'discountPercentage') {
        return { ...item, discountPercentage: nextValue, discountAmount: item.qty * item.unitCost * nextValue / 100 }
      }
      if (field === 'discountAmount') {
        const lineValue = item.qty * item.unitCost
        return { ...item, discountAmount: nextValue, discountPercentage: lineValue > 0 ? nextValue / lineValue * 100 : 0 }
      }
      if (field === 'mrp') {
        return { ...item, mrp: nextValue, price: nextValue * (1 - item.mrpDiscount / 100) }
      }
      if (field === 'mrpDiscount') {
        return { ...item, mrpDiscount: nextValue, price: item.mrp * (1 - nextValue / 100) }
      }
      if (field === 'unitCost') {
        return { ...item, unitCost: nextValue, discountAmount: item.qty * nextValue * item.discountPercentage / 100 }
      }
      if (field === 'qty') {
        return { ...item, qty: nextValue, discountAmount: nextValue * item.unitCost * item.discountPercentage / 100 }
      }
      return { ...item, [field]: nextValue }
    }))
  }

  function addItem() {
    setItems((current) => [...current, createEmptyItem()])
  }

  function applyOcrToForm(data: OcrExtractedData) {
    if (data.billDate) {
      setInvoiceDate(data.billDate)
      setExpectedDeliveryDate(data.billDate)
    }

    if (data.billNumber) {
      setInvoiceNo(data.billNumber)
      setNotes((previous) => {
        const prefix = previous?.trim() ? `${previous.trim()}\n` : ''
        return `${prefix}Bill: ${data.billNumber}`
      })
    }

    if (data.items.length > 0) {
      setItems(data.items.map((item) => ({
        productId: undefined,
        name: item.name,
        hsnCode: '',
        qty: item.qty,
        unitCost: item.unitCost,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: item.taxRate,
        mrp: 0,
        mrpDiscount: 0,
        price: item.unitCost,
      })))
    }

    if (data.supplier.name) {
      const normalizedName = data.supplier.name.toLowerCase().trim()
      const normalizedPhone = data.supplier.phone?.replace(/\D/g, '').slice(-10)
      const normalizedEmail = data.supplier.email?.toLowerCase().trim()

      const matchedSupplier = suppliers.find((supplier) => {
        const nameMatch = supplier.name.toLowerCase().trim() === normalizedName
        if (nameMatch) return true
        const supplierPhone = supplier.phone?.replace(/\D/g, '').slice(-10)
        const supplierEmail = supplier.email?.toLowerCase().trim()
        return supplierPhone === normalizedPhone || supplierEmail === normalizedEmail
      })
      if (matchedSupplier) setSupplierId(matchedSupplier._id)
    }
  }

  async function handleBillSelection(file: File) {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setOcrError('Only PDF, PNG, JPEG, and WebP files are supported for bill OCR.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setOcrError('Please upload a file smaller than 10 MB.')
      return
    }

    setOcrBusy(true)
    setOcrProgress(0)
    setOcrStage('Preparing OCR engine')
    setOcrError(null)
    setOcrFileName(file.name)
    try {
      setOcrStage('Uploading bill to Gemini')
      setOcrProgress(0.2)
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/purchases/ocr', { method: 'POST', body: formData })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || 'Unable to extract bill details')
      const extracted = result.data as OcrExtractedData
      setOcrProgress(1)
      setOcrStage('Extraction complete')
      setOcrData(extracted)
    } catch (extractionError) {
      setOcrData(null)
      setOcrError(extractionError instanceof Error ? extractionError.message : 'Could not extract bill details. Please retry or continue with manual entry.')
    } finally {
      setOcrBusy(false)
    }
  }

  async function createSupplierDraftFromOcr() {
    if (!ocrData?.supplier?.name) {
      setOcrError('Supplier name is required to create a draft supplier.')
      return
    }

    setCreatingSupplierDraft(true)
    setError(null)
    try {
      const response = await fetch('/api/purchases/ocr/supplier-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ocrData.supplier.name,
          phone: ocrData.supplier.phone,
          email: ocrData.supplier.email,
          gstNumber: ocrData.supplier.gstNumber,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to create supplier draft')
      }

      const newSupplier = result?.data as SupplierOption | undefined
      if (newSupplier?._id) {
        setSupplierId(newSupplier._id)
        await mutate('/api/suppliers?limit=100')
      }
    } catch (supplierError) {
      setError(supplierError instanceof Error ? supplierError.message : 'Unable to create supplier draft')
    } finally {
      setCreatingSupplierDraft(false)
    }
  }

  function removeItem(index: number) {
    setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index))
  }

  function updateProductFields(index: number, field: 'name' | 'hsnCode', value: string) {
    const normalizedValue = value.trim().toLowerCase()
    const product = products.find((candidate) => {
      const candidateValue = field === 'name' ? candidate.name : candidate.hsnCode
      return candidateValue?.trim().toLowerCase() === normalizedValue
    })

    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      if (!product) {
        return field === 'name'
          ? { ...item, name: value, productId: undefined, hsnCode: '', taxRate: 0 }
          : { ...item, hsnCode: value, productId: undefined, name: '', taxRate: 0 }
      }

      const gstRate = product.gstRate ?? product.taxRate ?? 0
      return {
        ...item,
        productId: product._id,
        name: product.name,
        hsnCode: product.hsnCode ?? '',
        taxRate: gstRate,
      }
    }))
  }

  async function createPurchaseOrder() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        supplierId,
        invoiceNo,
        invoiceDate,
        paymentTerms,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        ocrMeta: ocrData
          ? {
            confidence: Number(ocrData.confidence.toFixed(2)),
            extractedAt: new Date().toISOString(),
            source: 'gemini-flash-lite',
            warnings: ocrData.warnings.map((warning) => warning.code),
          }
          : undefined,
        items: items.map((item) => ({
          ...item,
          total: calculateLineTotal(item),
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

  async function openView(id: string) {
    setViewOpen(true)
    setViewLoading(true)
    setViewError(null)
    try {
      const response = await fetch(`/api/purchases/${id}`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to load purchase order')
      }
      setSelectedPurchase(result?.data as PurchaseRow)
    } catch (loadError) {
      setSelectedPurchase(null)
      setViewError(loadError instanceof Error ? loadError.message : 'Unable to load purchase order')
    } finally {
      setViewLoading(false)
    }
  }

  async function runInventoryPost(id: string) {
    setActioningId(id)
    setError(null)
    try {
      const response = await fetch(`/api/purchases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_to_inventory' }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to add products to inventory')
      }
      await mutate(purchasesQuery)
      if (selectedPurchase?._id === id) {
        setSelectedPurchase(result?.data as PurchaseRow)
      }
    } catch (inventoryError) {
      setError(inventoryError instanceof Error ? inventoryError.message : 'Unable to add products to inventory')
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
    <FeatureGate feature="purchase_management" fallback={<LockedPage feature="Purchase Management" />}>
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
              render: (id, row) => (
                <RowActions
                  row={row}
                  onAction={runAction}
                  onView={openView}
                  onInventoryPost={runInventoryPost}
                  busyId={actioningId}
                />
              ),
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create purchase order"
        className="min-w-[75vw] max-w-[100vw]"
      >
        <div className="space-y-4">
          {billOcrEnabled ? (
            <BillImageInput
              busy={ocrBusy}
              fileName={ocrFileName}
              error={ocrError}
              onFileSelected={(file, source) => {
                void source
                void handleBillSelection(file)
              }}
              onClear={() => {
                setOcrData(null)
                setOcrFileName(null)
                setOcrError(null)
              }}
            />
          ) : null}

          {billOcrEnabled && ocrBusy ? (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-3 text-xs text-indigo-800">
              <div className="mb-2 flex items-center justify-between">
                <span>Extracting bill data...</span>
                <span>{Math.round(ocrProgress * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                  style={{ width: `${Math.max(4, Math.round(ocrProgress * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-indigo-700 capitalize">{ocrStage.replace(/_/g, ' ')}</p>
            </div>
          ) : null}

          {billOcrEnabled && ocrData ? (
            <OcrReviewPanel
              data={ocrData}
              creatingSupplierDraft={creatingSupplierDraft}
              onApply={() => {
                if (ocrData.confidence < OCR_AUTOFILL_CONFIDENCE_THRESHOLD) return
                applyOcrToForm(ocrData)
              }}
              onCreateSupplierDraft={() => {
                void createSupplierDraftFromOcr()
              }}
              onDismiss={() => {
                setOcrData(null)
                setOcrFileName(null)
                setOcrError(null)
              }}
            />
          ) : null}

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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Invoice no" value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} required />
            <Input label="Invoice date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required />
            <Input label="Payment terms" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} />
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
              const lineTotal = calculateLineTotal(item)
              return (
                <div key={`item-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Input
                        label="Product name"
                        list="purchase-product-names"
                        value={item.name}
                        onChange={(event) => updateProductFields(index, 'name', event.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="HSN code"
                        list="purchase-product-hsn"
                        value={item.hsnCode}
                        onChange={(event) => updateProductFields(index, 'hsnCode', event.target.value)}
                      />
                    </div>
                    <Input label="Quantity" type="number" min="1" value={item.qty} onChange={(event) => updateItem(index, 'qty', event.target.value)} />
                    <Input label="Purchase rate" type="number" min="0" step="0.01" value={item.unitCost} onChange={(event) => updateItem(index, 'unitCost', event.target.value)} />
                    <Input label="Tax %" type="number" min="0" step="0.01" value={item.taxRate} onChange={(event) => updateItem(index, 'taxRate', event.target.value)} />
                    <Input label="Discount %" type="number" min="0" max="100" step="0.01" value={item.discountPercentage} onChange={(event) => updateItem(index, 'discountPercentage', event.target.value)} />
                    <Input label="Discount amount" type="number" min="0" step="0.01" value={item.discountAmount} onChange={(event) => updateItem(index, 'discountAmount', event.target.value)} />
                    <Input label="MRP" type="number" min="0" step="0.01" value={item.mrp} onChange={(event) => updateItem(index, 'mrp', event.target.value)} />
                    <Input label="MRP discount %" type="number" min="0" max="100" step="0.01" value={item.mrpDiscount} onChange={(event) => updateItem(index, 'mrpDiscount', event.target.value)} />
                    <Input label="Price" type="number" value={item.price.toFixed(2)} readOnly className="bg-gray-50" />
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

          <datalist id="purchase-product-names">
            {products.map((product) => <option key={`name-${product._id}`} value={product.name} />)}
          </datalist>
          <datalist id="purchase-product-hsn">
            {products.filter((product) => product.hsnCode).map((product) => <option key={`hsn-${product._id}`} value={product.hsnCode} />)}
          </datalist>

          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-3 text-sm text-indigo-900">
            Order total: {formatCurrency(items.reduce((sum, item) => sum + calculateLineTotal(item), 0))}
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

      <Modal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false)
          setSelectedPurchase(null)
          setViewError(null)
        }}
        title={selectedPurchase ? `Purchase order ${selectedPurchase.poNo}` : 'Purchase order'}
        className="max-w-3xl"
      >
        {viewLoading ? <Skeleton className="h-48 w-full rounded-lg bg-gray-100" /> : null}
        {viewError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{viewError}</div>
        ) : null}
        {selectedPurchase ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Supplier</p>
                <p className="font-medium text-gray-900">{selectedPurchase.supplierSnapshot?.name || '—'}</p>
                <p className="text-xs text-gray-500">{selectedPurchase.supplierSnapshot?.code || ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant={purchaseStatusBadge(selectedPurchase.status)}>{formatStatus(selectedPurchase.status)}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-semibold text-gray-900">{formatCurrency(selectedPurchase.total)}</p>
                <p className="text-xs text-gray-500">Created {formatDate(selectedPurchase.createdAt)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Items</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">HSN</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit cost</th>
                      <th className="px-3 py-2">Tax %</th>
                      <th className="px-3 py-2 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {selectedPurchase.items.map((item, index) => (
                      <tr key={`view-item-${index}`}>
                        <td className="px-3 py-2 text-gray-800">{item.name}</td>
                        <td className="px-3 py-2 text-gray-700">{item.hsnCode || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{item.qty}</td>
                        <td className="px-3 py-2 text-gray-700">{formatCurrency(item.unitCost ?? 0)}</td>
                        <td className="px-3 py-2 text-gray-700">{item.taxRate ?? 0}%</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(item.total ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
              Inventory sync: {selectedPurchase.inventoryPostedAt ? `Posted on ${formatDate(selectedPurchase.inventoryPostedAt)}` : 'Not posted yet'}
            </div>
          </div>
        ) : null}
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
  onView,
  onInventoryPost,
  busyId,
}: {
  row: PurchaseRow
  onAction: (id: string, action: 'approve' | 'send' | 'receive' | 'cancel') => Promise<void>
  onView: (id: string) => Promise<void>
  onInventoryPost: (id: string) => Promise<void>
  busyId: string | null
}) {
  const disabled = busyId === row._id
  return (
    <div className="flex gap-2">
      <button
        disabled={disabled}
        onClick={() => onView(row._id)}
        className="text-gray-400 hover:text-slate-700 disabled:opacity-40"
        title="View purchase order"
      >
        <Eye size={14} />
      </button>
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
      {row.status === 'received' ? (
        <button
          disabled={disabled || Boolean(row.inventoryPostedAt)}
          onClick={() => onInventoryPost(row._id)}
          className="text-gray-400 hover:text-indigo-700 disabled:opacity-40"
          title={row.inventoryPostedAt ? 'Already added to inventory' : 'Add purchase products to inventory'}
        >
          <Boxes size={14} />
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

function createEmptyItem(): PurchaseItemForm {
  return {
    productId: undefined,
    name: '',
    hsnCode: '',
    qty: 1,
    unitCost: 0,
    discountPercentage: 0,
    discountAmount: 0,
    taxRate: 0,
    mrp: 0,
    mrpDiscount: 0,
    price: 0,
  }
}

function calculateLineTotal(item: PurchaseItemForm) {
  const base = Math.max(0, item.qty * item.unitCost - item.discountAmount)
  return base + (base * item.taxRate) / 100
}

