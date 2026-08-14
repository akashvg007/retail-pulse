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
import { LockedPage } from '@/components/LockedPage'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import ModalFooter from '@/components/ModalFooter';

type CustomerForm = z.infer<typeof customerSchema>
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CustomersPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerForm | null>(null)
  const { data, isLoading } = useSWR('/api/customers?limit=50', fetcher)
  const customers = data?.data ?? []

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  })

  function openCreate() {
    setEditing(null)
    reset({})
    setOpen(true)
  }

  function openEdit(customer: CustomerForm) {
    setEditing(customer)
    reset(customer)
    setOpen(true)
  }

  async function onSubmit(data: CustomerForm) {
    const url = editing ? `/api/customers/${editing?._id}` : '/api/customers'
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
    <FeatureGate feature="crm" fallback={<LockedPage feature="CRM" />}>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <Button className="bg-blue-500 hover:bg-blue-700 px-4 py-2" onClick={openCreate} size="sm"><Plus size={14} /> Add customer</Button>
        </div>

        <Table
          columns={[
            { key: 'name', from:'customer', label: 'Name' },
            { key: 'email',from:'customer', label: 'Email' },
            { key: 'phone',from:'customer', label: 'Phone' },
            { key: 'gstNumber', from:'customer', label: 'GST No.' },
            { key: '_id',from:'customer', label: '', render: (_: string, row: CustomerForm) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-gray-400 hover:text-indigo-600"><Pencil size={14} /></button>
                <button onClick={() => deleteCustomer(row?._id ?? '')} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
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
          <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          <Input label="Address" error={errors.address?.message} {...register('address')} />
          <Input label="GST Number" error={errors.gstNumber?.message} {...register('gstNumber')} />
          <ModalFooter primaryButton={{ label: editing ? 'Update' : 'Create', loadingText: editing ? 'Updating…' : 'Creating…' }}
            secondaryButton={{ label: 'Cancel', onClick: () => setOpen(false) }}
          />
        </form>
      </Modal>
    </FeatureGate>
  )
}


