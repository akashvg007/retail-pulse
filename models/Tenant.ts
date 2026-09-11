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

export interface IInvoiceDisplaySettings {
  showCompanyName: boolean
  showAddress: boolean
  showGstNumber: boolean
  showLogo: boolean
  showContactDetails: boolean
  showCustomerDetails: boolean
  showItemTax: boolean
  showTotals: boolean
  showNotes: boolean
  showPaymentTerms: boolean
  showFooter: boolean
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
    invoiceDisplay?: Partial<IInvoiceDisplaySettings>
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
      invoiceDisplay: {
        showCompanyName: { type: Boolean, default: true },
        showAddress: { type: Boolean, default: true },
        showGstNumber: { type: Boolean, default: true },
        showLogo: { type: Boolean, default: true },
        showContactDetails: { type: Boolean, default: true },
        showCustomerDetails: { type: Boolean, default: true },
        showItemTax: { type: Boolean, default: true },
        showTotals: { type: Boolean, default: true },
        showNotes: { type: Boolean, default: true },
        showPaymentTerms: { type: Boolean, default: true },
        showFooter: { type: Boolean, default: true },
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
