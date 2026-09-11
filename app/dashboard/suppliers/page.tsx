'use client'
import { useMemo, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supplierSchema } from '@/lib/validations'
import { FeatureGate } from '@/components/FeatureGate'
import { LockedPage } from '@/components/LockedPage'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import ModalFooter from '@/components/ModalFooter'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'

type SupplierForm = z.infer<typeof supplierSchema>

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SuppliersPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierForm | null>(null)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: '10', page: String(page) })
    if (search) params.set('search', search)
    return `/api/suppliers?${params.toString()}`
  }, [page, search])

  const { data, isLoading } = useSWR(query, fetcher)
  const suppliers = (data?.data ?? []) as SupplierForm[]
  const total = Number(data?.total ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / 10))
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1]
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
    if (page <= 3) return [1, 2, 3, 4, totalPages]
    if (page >= totalPages - 2) return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, page - 1, page, page + 1, totalPages]
  }, [page, totalPages])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema) as Resolver<SupplierForm>,
    defaultValues: { active: true },
  })

  function openCreate() {
    setEditing(null)
    reset({ active: true })
    setOpen(true)
  }

  function openEdit(supplier: SupplierForm) {
    setEditing(supplier)
    reset({ ...supplier })
    setOpen(true)
  }

  async function onSubmit(formData: SupplierForm) {
    const url = editing?._id ? `/api/suppliers/${editing._id}` : '/api/suppliers'
    await fetch(url, {
      method: editing?._id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    mutate(query)
    setOpen(false)
  }

  async function deleteSupplier(id: string) {
    if (!confirm('Archive this supplier?')) return
    await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    mutate(query)
  }

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <FeatureGate feature="supplier_management" fallback={<LockedPage feature="Supplier Management" />}>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
            <p className="mt-1 text-sm text-gray-500">Manage supplier records and procurement contacts.</p>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus size={14} /> Add supplier
          </Button>
        </div>

        <form onSubmit={onSearchSubmit} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by supplier name, code, email or phone"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setPage(1)
            }}
          >
            Clear
          </Button>
        </form>

        <Table
          columns={[
            { key: 'name', from: 'supplier', label: 'Supplier' },
            { key: 'code', from: 'supplier', label: 'Code' },
            { key: 'contactPerson', from: 'supplier', label: 'Contact' },
            { key: 'phone', from: 'supplier', label: 'Phone' },
            { key: 'paymentTerms', from: 'supplier', label: 'Terms', render: (value) => value || '—' },
            {
              key: 'active',
              from: 'supplier',
              label: 'Status',
              render: (value) => <Badge variant={value ? 'green' : 'gray'}>{value ? 'Active' : 'Archived'}</Badge>,
            },
            {
              key: '_id',
              from: 'supplier',
              label: '',
              render: (id, row) => (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(row)} className="text-gray-400 hover:text-indigo-600">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteSupplier(id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
          data={suppliers}
          isLoading={isLoading}
          emptyMessage="No suppliers found."
        />

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
          <span>
            Showing page {page} of {totalPages} • {total} suppliers total
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit supplier' : 'Add supplier'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Supplier name" error={errors.name?.message} {...register('name')} />
            <Input label="Supplier code" error={errors.code?.message} {...register('code')} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Contact person" error={errors.contactPerson?.message} {...register('contactPerson')} />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          </div>
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Address" error={errors.address?.message} {...register('address')} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="GST Number" error={errors.gstNumber?.message} {...register('gstNumber')} />
            <div className="flex flex-col gap-1">
              <label htmlFor="payment-terms" className="text-sm font-medium text-gray-700">
                Payment terms
              </label>
              <select
                id="payment-terms"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                {...register('paymentTerms')}
              >
                <option value="">Select payment terms</option>
                <option value="Cash">Cash</option>
                <option value="Credit">Credit</option>
              </select>
              {errors.paymentTerms?.message && <p className="text-xs text-red-600">{errors.paymentTerms.message}</p>}
            </div>
          </div>
          <Input label="Notes" error={errors.notes?.message} {...register('notes')} />
          <ModalFooter
            primaryButton={{ label: editing ? 'Update' : 'Create', loadingText: editing ? 'Updating…' : 'Creating…' }}
            secondaryButton={{ label: 'Cancel', onClick: () => setOpen(false) }}
          />
        </form>
      </Modal>
    </FeatureGate>
  )
}

