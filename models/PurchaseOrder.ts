import mongoose, { Document, Model, Schema } from 'mongoose'

export type PurchaseOrderStatus =
  | 'draft'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'cancelled'

export type PurchasePaymentStatus = 'unpaid' | 'partially_paid' | 'paid'

export interface PurchaseOrderItem {
  productId?: mongoose.Types.ObjectId
  name: string
  qty: number
  receivedQty: number
  returnedQty: number
  unitCost: number
  taxRate: number
  total: number
}

export interface IPurchaseOrder extends Document {
  tenantId: mongoose.Types.ObjectId
  poNo: string
  supplierId: mongoose.Types.ObjectId
  supplierSnapshot: {
    code: string
    name: string
    email?: string
    phone?: string
    gstNumber?: string
  }
  items: PurchaseOrderItem[]
  subtotal: number
  taxAmount: number
  total: number
  receivedValue: number
  paidAmount: number
  paymentStatus: PurchasePaymentStatus
  status: PurchaseOrderStatus
  expectedDeliveryDate?: Date
  approvedAt?: Date
  sentAt?: Date
  receivedAt?: Date
  notes?: string
  ocrMeta?: {
    source: string
    confidence: number
    extractedAt: Date
    warnings: string[]
  }
  inventoryPostedAt?: Date
  inventoryPostSummary?: Array<{
    name: string
    sku: string | null
    qtyAdded: number
  }>
  createdAt: Date
  updatedAt: Date
}

const PurchaseOrderItemSchema = new Schema<PurchaseOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    receivedQty: { type: Number, default: 0, min: 0 },
    returnedQty: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    poNo: { type: String, required: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierSnapshot: {
      code: { type: String, required: true },
      name: { type: String, required: true },
      email: String,
      phone: String,
      gstNumber: String,
    },
    items: { type: [PurchaseOrderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    receivedValue: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'sent', 'partially_received', 'received', 'cancelled'],
      default: 'draft',
    },
    expectedDeliveryDate: Date,
    approvedAt: Date,
    sentAt: Date,
    receivedAt: Date,
    notes: String,
    ocrMeta: {
      source: String,
      confidence: Number,
      extractedAt: Date,
      warnings: { type: [String], default: [] },
    },
    inventoryPostedAt: Date,
    inventoryPostSummary: {
      type: [
        {
          _id: false,
          name: String,
          sku: String,
          qtyAdded: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

PurchaseOrderSchema.index({ tenantId: 1, poNo: 1 }, { unique: true })
PurchaseOrderSchema.index({ tenantId: 1, status: 1 })
PurchaseOrderSchema.index({ tenantId: 1, supplierId: 1 })

export const PurchaseOrder: Model<IPurchaseOrder> =
  mongoose.models.PurchaseOrder ?? mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema)