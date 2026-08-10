'use client'
import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema } from '@/lib/validations'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import ModalFooter from '@/components/ModalFooter'
import type { ProductForm } from './types'

interface ProductModalProps {
  open: boolean
  editing: ProductForm | null
  onClose: () => void
  onSuccess: () => void
}

export function ProductModal({ open, editing, onClose, onSuccess }: ProductModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
  })

  useEffect(() => {
    if (open) reset(editing ?? {})
  }, [open, editing, reset])

  async function onSubmit(data: ProductForm) {
    const url = editing ? `/api/products/${editing._id}` : '/api/products'
    await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    onSuccess()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit product' : 'Add product'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Price (₹)"
            type="number"
            step="0.01"
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />
          <Input label="Cost (₹)" type="number" step="0.01" {...register('cost', { valueAsNumber: true })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Stock qty" type="number" {...register('stockQty', { valueAsNumber: true })} />
          <Input label="Tax rate (%)" type="number" {...register('taxRate', { valueAsNumber: true })} />
        </div>
        <Input label="Category" {...register('category')} />
        <ModalFooter
          primaryButton={{ label: editing ? 'Update' : 'Create', loadingText: editing ? 'Updating…' : 'Creating…' }}
          secondaryButton={{ label: 'Cancel', onClick: onClose }}
        />
      </form>
    </Modal>
  )
}
