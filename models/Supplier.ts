import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISupplier extends Document {
  tenantId: mongoose.Types.ObjectId
  code: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  gstNumber?: string
  paymentTerms?: string
  notes?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const SupplierSchema = new Schema<ISupplier>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: String,
    address: String,
    gstNumber: String,
    paymentTerms: String,
    notes: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

SupplierSchema.index({ tenantId: 1, code: 1 }, { unique: true })
SupplierSchema.index({ tenantId: 1, active: 1 })

export const Supplier: Model<ISupplier> =
  mongoose.models.Supplier ?? mongoose.model<ISupplier>('Supplier', SupplierSchema)