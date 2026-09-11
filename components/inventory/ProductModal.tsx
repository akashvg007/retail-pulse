'use client'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema } from '@/lib/validations'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '../ui/ProgressBar'
import ModalFooter from '@/components/ModalFooter'
import type { ProductForm } from './types'
import { Card, CardBody } from '../ui/Card'
import { uploadImageToCloudinary } from "@/util/common.util";
import { Label } from '../ui/label'
import Image from 'next/image'

interface ProductModalProps {
  open: boolean
  editing: ProductForm | null
  onClose: () => void
  onSuccess: () => void
}

export function ProductModal({ open, editing, onClose, onSuccess }: ProductModalProps) {
  const [images, setImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
  })

  useEffect(() => {
    if (open) reset(editing ?? {})
  }, [open, editing, reset])

  async function onSubmit(data: ProductForm) {
    const url = editing ? `/api/products/${editing._id}` : '/api/products'
    await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, images }),
    })
    onSuccess()
    onClose()
  }

   // Upload images to Cloudinary
  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const uploaded: string[] = [];

    setUploadProgress(0);

    for (const file of Array.from(files)) {
      const imgUrl = await uploadImageToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });
      uploaded.push(imgUrl);
    }

    setImages((prev) => [...prev, ...uploaded]);
    setUploadProgress(null);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit product' : 'Add product'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Image Upload */}
      <Card className="mb-6">
        <CardBody className="space-y-4 p-4">
          <Label htmlFor="images" className="mb-1 block">
            Upload Images
          </Label>
          <Input id="images" type="file" multiple onChange={uploadImage} />
          {uploadProgress !== null && <ProgressBar progress={uploadProgress} />}
          <div className="grid grid-cols-3 gap-3 mt-2">
            {images.map((img, i) => (
              <Image 
                key={i}
                src={img}
                width={100}
                height={100}
                alt="preview"
                quality={60}
                className="w-full h-32 object-cover rounded-md border"
              />
            ))}
          </div>
        </CardBody>
      </Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="HSN code" error={errors.hsnCode?.message} {...register('hsnCode')} />
          <Input label="GST (%)" type="number" step="0.01" error={errors.gstRate?.message} {...register('gstRate', { valueAsNumber: true })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Selling price (₹)"
            type="number"
            step="0.01"
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />
          <Input label="Actual cost (₹)" type="number" step="0.01" {...register('cost', { valueAsNumber: true })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="MRP (₹)" type="number" step="0.01" error={errors.mrp?.message} {...register('mrp', { valueAsNumber: true })} />
          <Input label="Stock qty" type="number" {...register('stockQty', { valueAsNumber: true })} />
        </div>
        <Input label="Category" {...register('category')} />
        <ModalFooter
          primaryButton={{ label: editing ? 'Update' : 'Create', loadingText: editing ? 'Updating…' : 'Creating…' }}
          secondaryButton={{ label: 'Cancel', onClick: onClose }}
        />
      </form>
    </Modal>
  )
}

