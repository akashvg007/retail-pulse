'use client'
import { useMemo, useRef, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema } from '@/lib/validations'
import { z } from 'zod'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { Download, FileSpreadsheet, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import ModalFooter from '@/components/ModalFooter'
import { read, utils, writeFile } from 'xlsx'
import { normalizeImportRow, type ProductImportPayload } from '@/lib/inventory-import'

type ProductForm = z.infer<typeof productSchema>
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function InventoryPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductForm | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { data, isLoading } = useSWR(`/api/products?limit=10&page=${page}`, fetcher)
  const products = (data?.data ?? []) as ProductForm[]
  const total = Number(data?.total ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / 10))
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1]
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)

    if (page <= 3) {
      return [1, 2, 3, 4, totalPages]
    }

    if (page >= totalPages - 2) {
      return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, page - 1, page, page + 1, totalPages]
  }, [page, totalPages])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
  })

  function openCreate() {
    setEditing(null)
    reset({})
    setOpen(true)
  }

  function openEdit(product: ProductForm) {
    setEditing(product)
    reset({ ...product })
    setOpen(true)
  }

  async function onSubmit(data: ProductForm) {
    const url = editing ? `/api/products/${editing?._id}` : '/api/products'
    await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    mutate(`/api/products?limit=10&page=${page}`)
    setOpen(false)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    mutate(`/api/products?limit=10&page=${page}`)
  }

  function downloadSampleTemplate() {
    const headers = ['name', 'sku', 'category', 'price', 'cost', 'stockQty', 'taxRate', 'description']
    const rows = [
      ['Milk Powder', 'MILK-001', 'Beverages', 250, 180, 50, 5, 'Daily essentials'],
      ['Soap', 'SOAP-002', 'Household', 45, 28, 120, 5, 'Bathing soap'],
    ]

    const worksheet = utils.aoa_to_sheet([headers, ...rows])
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, worksheet, 'Inventory')
    writeFile(workbook, 'inventory-template.xlsx')
  }

  async function handleBulkImport(file: File | null) {
    if (!file) return

    const waitForProgress = (value: number) => new Promise<void>((resolve) => {
      setImportProgress(value)
      window.setTimeout(resolve, 180)
    })

    try {
      setImporting(true)
      setImportProgress(0)
      setImportError(null)
      setImportMessage(null)

      await waitForProgress(10)

      const workbook = read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>

      await waitForProgress(45)

      const productsToCreate = rows
        .map((row) => normalizeImportRow(row as Record<string, unknown>))
        .filter((row): row is ProductImportPayload => Boolean(row))

      if (!productsToCreate.length) {
        throw new Error('The selected file does not contain any usable inventory rows.')
      }

      await waitForProgress(70)

      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsToCreate }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to import inventory from the selected file.')
      }

      await waitForProgress(100)
      mutate(`/api/products?limit=10&page=${page}`)
      setImportMessage(`Imported ${payload.count ?? productsToCreate.length} products successfully.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to import inventory.')
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }

  return (
    <FeatureGate
      feature="inventory"
      fallback={<LockedPage name="Inventory" />}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={downloadSampleTemplate}>
              <Download size={14} /> Sample sheet
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Import Excel
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus size={14} /> Add product
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 p-4 text-sm text-indigo-900">
          <div className="flex items-center gap-2 font-medium">
            <FileSpreadsheet size={16} /> Bulk upload format
          </div>
          <p className="mt-2 text-indigo-800">
            Upload a .xlsx or .csv file with the columns shown in the sample template. The importer will create products using the same structure as manual entry.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(event) => handleBulkImport(event.target.files?.[0] ?? null)}
          />
        </div>

        {importing ? (
          <div className="rounded-lg border border-indigo-200 bg-white px-3 py-3 text-sm text-indigo-700">
            <div className="mb-2 flex items-center justify-between">
              <span>Importing inventory…</span>
              <span>{importProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-indigo-100">
              <div
                className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        ) : null}

        {importMessage ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {importMessage}
          </div>
        ) : null}
        {importError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {importError}
          </div>
        ) : null}

        <Table
          columns={[
            { key: 'name',from:'inventory', label: 'Name' },
            { key: 'sku',from:'inventory', label: 'SKU' },
            { key: 'category',from:'inventory', label: 'Category' },
            { key: 'price',from:'inventory', label: 'Price', render: (v) => formatCurrency(v) },
            { key: 'stockQty',from:'inventory', label: 'Stock', render: (v) => (
              <Badge variant={v > 0 ? 'green' : 'red'}>{v} units</Badge>
            )},
            { key: '_id',from:'inventory', label: '', render: (_, row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-gray-400 hover:text-indigo-600">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteProduct(row._id!)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            )},
          ]}
          data={products}
          emptyMessage={isLoading ? 'Loading…' : 'No products yet. Add your first product.'}
        />

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
          <span>
            Showing page {page} of {totalPages} • {total} products total
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </Button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`h-8 w-8 rounded-md border text-sm ${pageNumber === page ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {pageNumber}
              </button>
            ))}
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit product' : 'Add product'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" error={errors.name?.message} {...register('name')} />
            <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (₹)" type="number" step="0.01" error={errors.price?.message}
              {...register('price', { valueAsNumber: true })} />
            <Input label="Cost (₹)" type="number" step="0.01" {...register('cost', { valueAsNumber: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Stock qty" type="number" {...register('stockQty', { valueAsNumber: true })} />
            <Input label="Tax rate (%)" type="number" {...register('taxRate', { valueAsNumber: true })} />
          </div>
          <Input label="Category" {...register('category')} />
          <ModalFooter primaryButton={{ label: editing ? 'Update' : 'Create', loadingText: editing ? 'Updating…' : 'Creating…' }}
            secondaryButton={{ label: 'Cancel', onClick: () => setOpen(false) }}
          />
        </form>
      </Modal>
    </FeatureGate>
  )
}

function LockedPage({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">{name} is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">
        Contact your administrator to enable this feature for your account.
      </p>
    </div>
  )
}
