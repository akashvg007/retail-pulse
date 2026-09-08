'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FEATURE_META, ALL_FEATURE_KEYS, type FeatureKey } from '@/types/features'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import ToggleSlider from '@/components/ToggleSlider';
import { FeaturePageSkeleton } from '@/components/loading/PageSkeletons'

export default function TenantFeaturesPage() {
  const { id: tenantId } = useParams<{ id: string }>()
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({} as Record<FeatureKey, boolean>)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/features/tenant/${tenantId}`)
      .then((r) => r.json())
      .then((json) => { setFeatures(json.data ?? {}); setLoading(false) })
  }, [tenantId])

  function toggle(key: FeatureKey) {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/features/tenant/${tenantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="max-w-2xl space-y-6 p-4 sm:p-6 h-screen">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tenants">
          <button className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Feature Access</h1>
          <p className="text-sm text-gray-500">Toggle features for this tenant</p>
        </div>
      </div>

      {loading ? (
        <FeaturePageSkeleton />
      ) : (
        <div className="space-y-2">
          {ALL_FEATURE_KEYS.map((key) => {
            const meta = FEATURE_META[key]
            const enabled = features[key] ?? false
            return (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{meta.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                </div>
                <ToggleSlider
                  toggleKey={key}
                  field="beta"
                  primaryColor="bg-indigo-600"
                  isEnabled={enabled ?? false}
                  label={enabled ? 'Enabled' : 'Disabled'}
                  toggle={toggle}
                />
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-3 pb-4">
        <Button onClick={save} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
        </Button>
        {saved && <p className="text-sm text-green-600">Saved ✓</p>}
      </div>
    </div>
  )
}
