'use client'
import { useState } from 'react'
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
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import ModalFooter from '@/components/ModalFooter';

type ProductForm = z.infer<typeof productSchema>
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function InventoryPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductForm | null>(null)
  const { data, isLoading } = useSWR('/api/products?limit=50', fetcher)
  const products = (data?.data ?? []) as ProductForm[]

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
    mutate('/api/products?limit=50')
    setOpen(false)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    mutate('/api/products?limit=50')
  }

  return (
    <FeatureGate
      feature="inventory"
      fallback={<LockedPage name="Inventory" />}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <Button onClick={openCreate} size="sm">
            <Plus size={14} /> Add product
          </Button>
        </div>

        <Table
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'sku', label: 'SKU' },
            { key: 'category', label: 'Category' },
            { key: 'price', label: 'Price', render: (v) => formatCurrency(v) },
            { key: 'stockQty', label: 'Stock', render: (v) => (
              <Badge variant={v > 0 ? 'green' : 'red'}>{v} units</Badge>
            )},
            { key: '_id', label: '', render: (_, row) => (
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
