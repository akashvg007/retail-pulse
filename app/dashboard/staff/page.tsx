'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { staffSchema } from '@/lib/validations'
import { z } from 'zod'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { Plus, Trash2 } from 'lucide-react'
import ModalFooter from '@/components/ModalFooter';

type StaffForm = z.infer<typeof staffSchema>
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function StaffPage() {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useSWR('/api/staff', fetcher)
  const staffList = data?.data ?? []

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
  })

  async function onSubmit(data: StaffForm) {
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    mutate('/api/staff')
    setOpen(false)
    reset()
  }

  async function deleteStaff(id: string) {
    if (!confirm('Remove this staff member?')) return
    await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    mutate('/api/staff')
  }

  return (
    <FeatureGate feature="staff_management" fallback={<LockedPage />}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Staff</h1>
          <Button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => { reset(); setOpen(true) }} size="sm">
            <Plus size={14} /> Add staff
          </Button>
        </div>

        <Table
          columns={[
            { key: 'userId', label: 'Name', render: (v) => v?.name ?? '—' },
            { key: 'userId', label: 'Email', render: (v) => v?.email ?? '—' },
            { key: 'department', label: 'Department' },
            { key: 'userId', label: 'Status', render: (v) => (
              <Badge variant={v?.active ? 'green' : 'red'}>{v?.active ? 'Active' : 'Inactive'}</Badge>
            )},
            { key: '_id', label: '', render: (id) => (
              <button onClick={() => deleteStaff(id)} className="text-gray-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            )},
          ]}
          data={staffList}
          emptyMessage={isLoading ? 'Loading…' : 'No staff members yet.'}
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add staff member">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input label="Full name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
          <Input label="Department" {...register('department')} />
          <ModalFooter primaryButton={{ label: 'Add staff', loadingText: 'Adding…' }}
            secondaryButton={{ label: 'Cancel', onClick: () => setOpen(false) }}
          />
        </form>
      </Modal>
    </FeatureGate>
  )
}

function LockedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">Staff Management is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">Contact your administrator to enable this feature.</p>
    </div>
  )
}
