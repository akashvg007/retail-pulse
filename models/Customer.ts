import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICustomer extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  email?: string
  phone?: string
  address?: string
  gstNumber?: string
  createdAt: Date
  updatedAt: Date
}

const CustomerSchema = new Schema<ICustomer>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    address: String,
    gstNumber: String,
  },
  { timestamps: true }
)

CustomerSchema.index({ tenantId: 1 })

export const Customer: Model<ICustomer> =
  mongoose.models.Customer ?? mongoose.model<ICustomer>('Customer', CustomerSchema)
