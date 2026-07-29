import mongoose, { Schema, Document, Model } from 'mongoose'

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded'
export type PaymentMethod = 'razorpay' | 'cash' | 'bank_transfer' | 'cheque' | 'upi'

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId
  invoiceId: mongoose.Types.ObjectId
  amount: number
  currency: string
  method: PaymentMethod
  razorpayPaymentId?: string
  razorpayOrderId?: string
  razorpaySignature?: string
  status: PaymentStatus
  paidAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      enum: ['razorpay', 'cash', 'bank_transfer', 'cheque', 'upi'],
      default: 'razorpay',
    },
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySignature: String,
    status: {
      type: String,
      enum: ['pending', 'captured', 'failed', 'refunded'],
      default: 'pending',
    },
    paidAt: Date,
  },
  { timestamps: true }
)

PaymentSchema.index({ tenantId: 1, invoiceId: 1 })

export const Payment: Model<IPayment> =
  mongoose.models.Payment ?? mongoose.model<IPayment>('Payment', PaymentSchema)
