'use client'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { FEATURE_META, type FeatureKey } from '@/types/features'
import ToggleSlider from '@/components/ToggleSlider';

interface PlatformFlag {
  key: FeatureKey
  name: string
  description: string
  globalEnabled: boolean
  beta: boolean
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<PlatformFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/features/platform')
      .then((r) => r.json())
      .then((json) => { setFlags(json.data ?? []); setLoading(false) })
  }, [])

  async function toggle(key: FeatureKey, field: 'globalEnabled' | 'beta', value: boolean) {
    const res = await fetch('/api/features/platform', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, [field]: value }),
    })
    if (res.ok) {
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, [field]: value } : f))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Platform Feature Flags</h1>
        <p className="text-sm text-gray-500 mt-1">
          Control which features are available globally. Per-tenant overrides take precedence.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {`Enabling a feature globally makes it available to all tenants that don't have an explicit override.
        Use per-tenant feature access to control individual tenants.`}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{flag.name}</p>
                  {flag.beta && <Badge variant="yellow">beta</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{FEATURE_META[flag.key]?.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <ToggleSlider 
                  toggleKey={flag.key} 
                  field="beta" 
                  primaryColor="bg-yellow-400" 
                  isEnabled={flag.beta} 
                  label="Beta" 
                  toggle={toggle} />
                <ToggleSlider 
                  toggleKey={flag.key} 
                  field="globalEnabled" 
                  primaryColor="bg-indigo-600" 
                  isEnabled={flag.globalEnabled} 
                  label="Global" 
                  toggle={toggle} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
