import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITenant extends Document {
  slug: string
  name: string
  plan: 'basic' | 'pro' | 'enterprise'
  settings: {
    logo?: string
    gstNumber?: string
    address?: string
    taxRate: number
    currency: string
  }
  invoiceCounter: number
  purchaseOrderCounter: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const TenantSchema = new Schema<ITenant>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    plan: { type: String, enum: ['basic', 'pro', 'enterprise'], default: 'basic' },
    settings: {
      logo: String,
      gstNumber: String,
      address: String,
      taxRate: { type: Number, default: 18 },
      currency: { type: String, default: 'INR' },
    },
    invoiceCounter: { type: Number, default: 0 },
    purchaseOrderCounter: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Tenant: Model<ITenant> =
  mongoose.models.Tenant ?? mongoose.model<ITenant>('Tenant', TenantSchema)
