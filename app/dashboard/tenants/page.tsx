'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useForm } from 'react-hook-form'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Plus, Settings } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TenantsPage() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data, isLoading } = useSWR('/api/tenants', fetcher)
  const tenants = data?.data ?? []

  // we should always avoid using any
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    name: string
    adminName: string
    adminEmail: string
    adminPassword: string
    plan: 'basic' | 'pro' | 'enterprise'
  }>()

  async function onSubmit(data: {
    name: string
    adminName: string
    adminEmail: string
    adminPassword: string
    plan: 'basic' | 'pro' | 'enterprise'
  }) {
    setError(null)
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed'); return }
    mutate('/api/tenants')
    setOpen(false)
    reset()
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    mutate('/api/tenants')
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500">Manage all registered organizations</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded " onClick={() => { reset(); setError(null); setOpen(true) }} size="sm">
          <Plus size={14} /> New tenant
        </Button>
      </div>

      <Table
        columns={[
          { key: 'name', label: 'Business name' },
          { key: 'slug', label: 'Slug' },
          { key: 'plan', label: 'Plan', render: (v) => (
            <Badge variant={v === 'enterprise' ? 'purple' : v === 'pro' ? 'blue' : 'gray'}>{v}</Badge>
          )},
          { key: 'active', label: 'Status', render: (v) => (
            <Badge variant={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Badge>
          )},
          { key: 'createdAt', label: 'Joined', render: (v) => formatDate(v) },
          { key: '_id', label: '', render: (id, row) => (
            <div className="flex gap-2">
              <Link href={`/dashboard/tenants/${id}/features`}>
                <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <Settings size={12} /> Features
                </button>
              </Link>
              <button
                onClick={() => toggleActive(id, !row.active)}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                {row.active ? 'Suspend' : 'Reactivate'}
              </button>
            </div>
          )},
        ]}
        data={tenants}
        emptyMessage={isLoading ? 'Loading…' : 'No tenants yet.'}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Create new tenant">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input label="Business name" {...register('name', { required: true })} />
          <Input label="Admin name" {...register('adminName', { required: true })} />
          <Input label="Admin email" type="email" {...register('adminEmail', { required: true })} />
          <Input label="Admin password" type="password" {...register('adminPassword', { required: true })} />
          <div>
            <label className="text-sm font-medium text-gray-700">Plan</label>
            <select className="mt-1 bg-blue-500 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('plan')}>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-500">
              {isSubmitting ? 'Creating…' : 'Create tenant'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
