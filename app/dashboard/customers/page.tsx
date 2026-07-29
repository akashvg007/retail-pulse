'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { customerSchema } from '@/lib/validations'
import { z } from 'zod'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { FeatureGate } from '@/components/FeatureGate'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type CustomerForm = z.infer<typeof customerSchema>
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CustomersPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const { data, isLoading } = useSWR('/api/customers?limit=50', fetcher)
  const customers = data?.data ?? []

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  })

  function openCreate() {
    setEditing(null)
    reset({})
    setOpen(true)
  }

  function openEdit(customer: any) {
    setEditing(customer)
    reset(customer)
    setOpen(true)
  }

  async function onSubmit(data: CustomerForm) {
    const url = editing ? `/api/customers/${editing._id}` : '/api/customers'
    await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    mutate('/api/customers?limit=50')
    setOpen(false)
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Delete this customer?')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    mutate('/api/customers?limit=50')
  }

  return (
    <FeatureGate feature="crm" fallback={<LockedPage />}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <Button onClick={openCreate} size="sm"><Plus size={14} /> Add customer</Button>
        </div>

        <Table
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'gstNumber', label: 'GST No.' },
            { key: '_id', label: '', render: (_, row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-gray-400 hover:text-indigo-600"><Pencil size={14} /></button>
                <button onClick={() => deleteCustomer(row._id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            )},
          ]}
          data={customers}
          emptyMessage={isLoading ? 'Loading…' : 'No customers yet.'}
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit customer' : 'Add customer'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Address" {...register('address')} />
          <Input label="GST Number" {...register('gstNumber')} />
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </FeatureGate>
  )
}

function LockedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">CRM is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">Contact your administrator to enable this feature.</p>
    </div>
  )
}
