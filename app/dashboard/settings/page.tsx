'use client'
import { useForm } from 'react-hook-form'
import Image from 'next/image'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { useState } from 'react'
import { uploadImageToCloudinary } from '@/util/common.util'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SettingsPageSkeleton } from '@/components/loading/PageSkeletons'
import Link from 'next/link'

interface SettingsForm {
  name?: string
  gstNumber?: string
  address?: string
  logo?: string
  taxRate: number
  currency: string
  pos: {
    quantityMode: 'buttons' | 'input'
    priceMode: 'product' | 'custom'
  }
  invoiceDisplay: {
    showCompanyName: boolean
    showAddress: boolean
    showGstNumber: boolean
    showLogo: boolean
    showContactDetails: boolean
    showCustomerDetails: boolean
    showCustomerAddress: boolean
    showItemTax: boolean
    showTotals: boolean
    showNotes: boolean
    showPaymentTerms: boolean
    showFooter: boolean
    showTaxSplit: boolean
  }
  branding?: {
    businessLogo?: string
    primaryColor?: string
    secondaryColor?: string
    tagline?: string
    paymentTerms?: string
    invoiceFooter?: string
    phone?: string
    email?: string
  }
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<SettingsForm>({
    defaultValues: async () => {
      const res = await fetch('/api/tenants/settings')
      const { data } = await res.json()
      setLoading(false)
      setLogoPreview(data?.logo || '')
      return {
        name: data?.name,
        gstNumber: data?.gstNumber,
        address: data?.address,
        logo: data?.logo,
        taxRate: data?.taxRate || 18,
        currency: data?.currency || 'INR',
        pos: {
          quantityMode: data?.pos?.quantityMode ?? 'buttons',
          priceMode: data?.pos?.priceMode ?? 'product',
        },
        invoiceDisplay: {
          showCompanyName: data?.invoiceDisplay?.showCompanyName ?? true,
          showAddress: data?.invoiceDisplay?.showAddress ?? true,
          showGstNumber: data?.invoiceDisplay?.showGstNumber ?? true,
          showLogo: data?.invoiceDisplay?.showLogo ?? true,
          showContactDetails: data?.invoiceDisplay?.showContactDetails ?? true,
          showCustomerDetails: data?.invoiceDisplay?.showCustomerDetails ?? true,
          showCustomerAddress: data?.invoiceDisplay?.showCustomerAddress ?? true,
          showItemTax: data?.invoiceDisplay?.showItemTax ?? true,
          showTotals: data?.invoiceDisplay?.showTotals ?? true,
          showNotes: data?.invoiceDisplay?.showNotes ?? true,
          showPaymentTerms: data?.invoiceDisplay?.showPaymentTerms ?? true,
          showFooter: data?.invoiceDisplay?.showFooter ?? true,
          showTaxSplit: data?.invoiceDisplay?.showTaxSplit ?? true,
        },
          branding: {
          ...data?.branding,
          businessLogo: data?.logo || data?.branding?.businessLogo
        }
      }
          },
  })


    // Upload images to Cloudinary
    const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const uploaded: string[] = [];

      setUploadProgress(0);

      for (const file of Array.from(files)) {
        const imgUrl = await uploadImageToCloudinary(file, (progress) => {
          setUploadProgress(progress);
        });
        uploaded.push(imgUrl);
        }

      setLogoPreview(uploaded[0]);
      setValue('logo', uploaded[0]);
      setUploadProgress(null);
    };

  async function onSubmit(data: SettingsForm) {
    try {
      const payload = {
        name: data.name,
        settings: {
          gstNumber: data.gstNumber,
          address: data.address,
          logo: data.logo,
          taxRate: data.taxRate,
          currency: data.currency,
          pos: data.pos,
          invoiceDisplay: data.invoiceDisplay,
          branding: {
            businessLogo: data.logo, // Syncing logo with branding.businessLogo
            primaryColor: data.branding?.primaryColor || undefined,
            secondaryColor: data.branding?.secondaryColor || undefined,
            tagline: data.branding?.tagline || undefined,
            paymentTerms: data.branding?.paymentTerms || undefined,
            invoiceFooter: data.branding?.invoiceFooter || undefined,
            phone: data.branding?.phone || undefined,
            email: data.branding?.email || undefined,
          },
        }
      }
      await fetch('/api/tenants/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPasswordSubmitting(true)
    setPasswordError('')
    setPasswordSaved(false)

    const formData = new FormData(form)
    const response = await fetch('/api/account/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword'),
      }),
    })

    const result = await response.json()
    setPasswordSubmitting(false)

    if (!response.ok) {
      const fieldErrors = result.error?.fieldErrors
      setPasswordError(fieldErrors ? Object.values(fieldErrors).flat()[0] || 'Unable to change password' : result.error || 'Unable to change password')
      return
    }

    form.reset()
    setPasswordSaved(true)
  }

  if (loading) {
    return <SettingsPageSkeleton />
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-800">Business Settings</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Business Info */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-sm font-semibold text-gray-700">Business Information</h3>
              <Input label="Company Name" placeholder="Your company name" {...register('name')} />
              <Input label="GST Number" placeholder="e.g., 27AAJPA1234F1Z5" {...register('gstNumber')} />
              <Input label="Address" placeholder="Business address" {...register('address')} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Default Tax Rate (%)" type="number" step="0.01" {...register('taxRate', { valueAsNumber: true })} />
                <div>
                  <label className="text-sm font-medium text-gray-700">Currency</label>
                  <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('currency')}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-b pb-6">
              <h3 className="text-sm font-semibold text-gray-700">Point of Sale</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Quantity entry</label>
                  <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('pos.quantityMode')}>
                    <option value="buttons">Plus and minus buttons</option>
                    <option value="input">Direct quantity input</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Selling price entry</label>
                  <select className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('pos.priceMode')}>
                    <option value="product">Use product price</option>
                    <option value="custom">Allow custom price</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-sm font-semibold text-gray-700">Branding</h3>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Business Logo</label>
                <Input id="images" type="file" multiple onChange={uploadImage} />
                {uploadProgress !== null && <ProgressBar progress={uploadProgress} />}

                {logoPreview && (
                  <div className="relative mt-2 flex h-20 items-center justify-center rounded-lg bg-gray-100 p-2">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={200}
                      height={80}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Primary Color</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-20 rounded border border-gray-300"
                      {...register('branding.primaryColor')}
                    />
                    <input
                      type="text"
                      placeholder="#000000"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      {...register('branding.primaryColor')}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Secondary Color</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-20 rounded border border-gray-300"
                      {...register('branding.secondaryColor')}
                    />
                    <input
                      type="text"
                      placeholder="#000000"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      {...register('branding.secondaryColor')}
                    />
                  </div>
                </div>
              </div>

              <Input label="Company Tagline" placeholder="Your company motto" {...register('branding.tagline')} />
            </div>

            {/* Contact Information */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-sm font-semibold text-gray-700">Contact Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Phone" type="tel" placeholder="+91 XXXXX XXXXX" {...register('branding.phone')} />
                <Input label="Email" type="email" placeholder="business@example.com" {...register('branding.email')} />
              </div>
            </div>

            {/* Invoice Settings */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Invoice Settings</h3>
                <Link
                  href="/dashboard/settings/invoice-template"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Open template editor
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  ['showCompanyName', 'Company name'],
                  ['showAddress', 'Company address'],
                  ['showGstNumber', 'GST number'],
                  ['showLogo', 'Company logo'],
                  ['showContactDetails', 'Phone and email'],
                  ['showCustomerDetails', 'Customer details'],
                  ['showCustomerAddress', 'Customer address'],
                  ['showItemTax', 'Item tax'],
                  ['showTotals', 'Invoice totals'],
                  ['showNotes', 'Notes'],
                  ['showPaymentTerms', 'Payment terms'],
                  ['showFooter', 'Invoice footer'],
                ] as const).map(([field, label]) => (
                  <label key={field} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" {...register(`invoiceDisplay.${field}`)} />
                    {label}
                  </label>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tax display</label>
                <select
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-sm"
                  {...register('invoiceDisplay.showTaxSplit', { setValueAs: (value) => value === 'true' })}
                >
                  <option value="true">Split tax into CGST and SGST</option>
                  <option value="false">Show one GST total</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Payment Terms</label>
                <textarea
                  placeholder="e.g., Net 30, Due on receipt, etc."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  {...register('branding.paymentTerms')}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Invoice Footer</label>
                <textarea
                  placeholder="Custom footer text or signature that appears on invoices"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  {...register('branding.invoiceFooter')}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
              {saved && <p className="text-sm text-green-600">✓ Saved successfully</p>}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-800">Change Password</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={changePassword} className="max-w-xl space-y-4">
            <Input label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
            <Input label="New password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
            <Input label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={passwordSubmitting}>
                {passwordSubmitting ? 'Updating…' : 'Update password'}
              </Button>
              {passwordSaved && <p className="text-sm text-green-600">Password updated successfully</p>}
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

