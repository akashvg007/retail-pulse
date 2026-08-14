import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IProduct extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  sku: string
  description?: string
  price: number
  cost: number
  category: string
  stockQty: number
  images: string[]
  taxRate: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    images: [{ type: String }],
    category: { type: String, default: 'General' },
    stockQty: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true })
ProductSchema.index({ tenantId: 1, active: 1 })
ProductSchema.index({ tenantId: 1, active: 1, sku: 1 })

export const Product: Model<IProduct> =
  mongoose.models.Product ?? mongoose.model<IProduct>('Product', ProductSchema)
