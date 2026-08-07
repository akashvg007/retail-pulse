import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBrandingSettings {
  businessLogo?: string // base64 or S3 URL
  primaryColor?: string // hex color code
  secondaryColor?: string // hex color code
  tagline?: string
  paymentTerms?: string // e.g., "Net 30"
  invoiceFooter?: string // custom footer text
  phone?: string
  email?: string
}

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
    branding?: IBrandingSettings
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
      branding: {
        businessLogo: String,
        primaryColor: String,
        secondaryColor: String,
        tagline: String,
        paymentTerms: String,
        invoiceFooter: String,
        phone: String,
        email: String,
      },
    },
    invoiceCounter: { type: Number, default: 0 },
    purchaseOrderCounter: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Tenant: Model<ITenant> =
  mongoose.models.Tenant ?? mongoose.model<ITenant>('Tenant', TenantSchema)
