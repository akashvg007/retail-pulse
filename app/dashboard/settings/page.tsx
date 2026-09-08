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

interface SettingsForm {
  name?: string
  gstNumber?: string
  address?: string
  logo?: string
  taxRate: number
  currency: string
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
        gstNumber: data?.gstNumber,
        address: data?.address,
        logo: data?.logo,
        taxRate: data?.taxRate || 18,
        currency: data?.currency || 'INR',
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
        settings: {
          gstNumber: data.gstNumber,
          address: data.address,
          logo: data.logo,
          taxRate: data.taxRate,
          currency: data.currency,
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
              <h3 className="text-sm font-semibold text-gray-700">Invoice Settings</h3>
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
    </div>
  )
}

