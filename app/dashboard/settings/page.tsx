'use client'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { useState } from 'react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{
    name: string
    gstNumber: string
    address: string
    taxRate: number
    currency: string
  }>()

  async function onSubmit(data: {
    name: string
    gstNumber: string
    address: string
    taxRate: number
    currency: string
  }) {
    await fetch('/api/tenants/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: data }),
    })
    setSaved(true)
  }

  return (
    <div className="max-w-xl space-y-6 p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-800">Business Settings</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Business Name" {...register('name')} />
            <Input label="GST Number" {...register('gstNumber')} />
            <Input label="Address" {...register('address')} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Default Tax Rate (%)" type="number" defaultValue={18} {...register('taxRate', { valueAsNumber: true })} />
              <div>
                <label className="text-sm font-medium text-gray-700">Currency</label>
                <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('currency')}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
              {saved && <p className="text-sm text-green-600">Saved ✓</p>}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
