import mongoose, { Schema, Document, Model } from 'mongoose'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceItem {
  productId?: mongoose.Types.ObjectId
  name: string
  qty: number
  returnedQty?: number
  price: number
  mrp: number
  taxRate: number
  total: number
}

export interface IInvoice extends Document {
  tenantId: mongoose.Types.ObjectId
  invoiceNo: string
  staffName?: string
  staffId?: mongoose.Types.ObjectId
  customerId?: mongoose.Types.ObjectId
  customerSnapshot?: { name: string; email?: string; address?: string; gstNumber?: string }
  items: InvoiceItem[]
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  status: InvoiceStatus
  razorpayOrderId?: string
  inventoryDeductedAt?: Date
  refundedAt?: Date
  dueDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const InvoiceItemSchema = new Schema<InvoiceItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    returnedQty: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  { _id: false }
)

const InvoiceSchema = new Schema<IInvoice>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    invoiceNo: { type: String, required: true },
    staffName: { type: String, required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerSnapshot: {
      name: String,
      email: String,
      address: String,
      gstNumber: String,
    },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    razorpayOrderId: String,
    inventoryDeductedAt: Date,
    refundedAt: Date,
    dueDate: Date,
    notes: String,
  },
  { timestamps: true }
)

InvoiceSchema.index({ tenantId: 1, invoiceNo: 1 }, { unique: true })
InvoiceSchema.index({ tenantId: 1, status: 1 })

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice ?? mongoose.model<IInvoice>('Invoice', InvoiceSchema)
