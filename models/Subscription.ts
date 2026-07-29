import mongoose, { Schema, Document, Model } from 'mongoose'

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired'

export interface ISubscription extends Document {
  tenantId: mongoose.Types.ObjectId
  plan: string
  razorpaySubscriptionId?: string
  startDate: Date
  endDate?: Date
  status: SubscriptionStatus
  createdAt: Date
  updatedAt: Date
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    plan: { type: String, required: true },
    razorpaySubscriptionId: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'expired'],
      default: 'active',
    },
  },
  { timestamps: true }
)

export const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ??
  mongoose.model<ISubscription>('Subscription', SubscriptionSchema)
