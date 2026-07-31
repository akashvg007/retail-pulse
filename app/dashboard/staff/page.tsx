'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { staffSchema } from '@/lib/validations'
import { z } from 'zod'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { Plus, Trash2, Settings2 } from 'lucide-react'
import ModalFooter from '@/components/ModalFooter'
import { useFeatures } from '@/contexts/FeatureContext'
import { FEATURE_META, ALL_FEATURE_KEYS, type FeatureKey } from '@/types/features'

type StaffForm = z.infer<typeof staffSchema>
const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Checklist shown when assigning features — only tenant-enabled features appear
function FeatureChecklist({
  tenantFeatures,
  selected,
  onChange,
}: {
  tenantFeatures: Record<string, boolean>
  selected: string[]
  onChange: (keys: string[]) => void
}) {
  const available = ALL_FEATURE_KEYS.filter((k) => tenantFeatures[k])
  if (available.length === 0) {
    return <p className="text-xs text-gray-400">No features enabled for this tenant yet.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {available.map((key) => {
        const checked = selected.includes(key)
        return (
          <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={checked}
              onChange={() =>
                onChange(checked ? selected.filter((k) => k !== key) : [...selected, key])
              }
            />
            <span className="text-sm text-gray-700">{FEATURE_META[key].name}</span>
          </label>
        )
      })}
    </div>
  )
}

export default function StaffPage() {
  const [open, setOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [staffFeatureMap, setStaffFeatureMap] = useState<Record<string, boolean>>({})
  const [savingFeatures, setSavingFeatures] = useState(false)

  const { data, isLoading } = useSWR('/api/staff', fetcher)
  const staffList = data?.data ?? []
  const tenantFeatures = useFeatures()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema) as Resolver<StaffForm>,
    defaultValues: { features: [] },
  })

  const watchedFeatures = watch('features') as string[]

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

  async function openFeatureEditor(userId: string) {
    setEditingUserId(userId)
    const res = await fetch(`/api/features/staff/${userId}`)
    const json = await res.json()
    const grants: Record<string, boolean> = json.data?.staffFeatures ?? {}
    setStaffFeatureMap(json.data?.tenantFeatures ?? {})
    setSelectedFeatures(Object.entries(grants).filter(([, v]) => v).map(([k]) => k))
    setFeaturesOpen(true)
  }

  async function saveStaffFeatures() {
    if (!editingUserId) return
    setSavingFeatures(true)
    const features = Object.fromEntries(
      ALL_FEATURE_KEYS.map((k) => [k, selectedFeatures.includes(k)])
    )
    await fetch(`/api/features/staff/${editingUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
    })
    setSavingFeatures(false)
    setFeaturesOpen(false)
  }

  return (
    <FeatureGate feature="staff_management" fallback={<LockedPage />}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Staff</h1>
          <Button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => { reset({ features: [] }); setOpen(true) }}
            size="sm"
          >
            <Plus size={14} /> Add staff
          </Button>
        </div>

        <Table
          columns={[
            { key: 'userId',from:'staff', label: 'Name', render: (v) => v?.name ?? '—' },
            { key: 'userId',from:'staff', label: 'Email', render: (v) => v?.email ?? '—' },
            { key: 'department',from:'staff', label: 'Department' },
            { key: 'userId',from:'staff', label: 'Status', render: (v) => (
              <Badge variant={v?.active ? 'green' : 'red'}>{v?.active ? 'Active' : 'Inactive'}</Badge>
            )},
            { key: '_id',from:'staff', label: '', render: (id, row) => (
              <div className="flex gap-2">
                <button
                  title="Manage feature access"
                  onClick={() => openFeatureEditor(row.userId?._id ?? row.userId)}
                  className="text-gray-400 hover:text-indigo-600"
                >
                  <Settings2 size={14} />
                </button>
                <button onClick={() => deleteStaff(id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            )},
          ]}
          data={staffList}
          emptyMessage={isLoading ? 'Loading…' : 'No staff members yet.'}
        />
      </div>

      {/* Add staff modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add staff member">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input label="Full name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
          <Input label="Department" {...register('department')} />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Feature access</p>
            <div className="rounded-lg border border-gray-200 p-3">
              <FeatureChecklist
                tenantFeatures={tenantFeatures}
                selected={watchedFeatures ?? []}
                onChange={(keys) => setValue('features', keys)}
              />
            </div>
          </div>

          <ModalFooter
            primaryButton={{ label: 'Add staff', loadingText: 'Adding…' }}
            secondaryButton={{ label: 'Cancel', onClick: () => setOpen(false) }}
          />
        </form>
      </Modal>

      {/* Edit staff features modal */}
      <Modal open={featuresOpen} onClose={() => setFeaturesOpen(false)} title="Manage feature access">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Enable only the features this staff member needs. Only tenant-enabled features are shown.
          </p>
          <div className="rounded-lg border border-gray-200 p-3">
            <FeatureChecklist
              tenantFeatures={staffFeatureMap}
              selected={selectedFeatures}
              onChange={setSelectedFeatures}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={saveStaffFeatures} disabled={savingFeatures} className="flex-1">
              {savingFeatures ? 'Saving…' : 'Save access'}
            </Button>
            <Button variant="secondary" onClick={() => setFeaturesOpen(false)}>Cancel</Button>
          </div>
        </div>
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
