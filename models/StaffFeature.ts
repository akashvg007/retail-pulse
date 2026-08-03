import mongoose, { Schema, Document, Model } from 'mongoose'
import { ALL_FEATURE_KEYS, type FeatureKey } from '@/types/features'

export interface IStaffFeature extends Document {
  tenantId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  featureKey: FeatureKey
  enabled: boolean
  grantedAt?: Date
  grantedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const StaffFeatureSchema = new Schema<IStaffFeature>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    featureKey: { type: String, required: true, enum: ALL_FEATURE_KEYS },
    enabled: { type: Boolean, required: true, default: false },
    grantedAt: Date,
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

StaffFeatureSchema.index({ tenantId: 1, userId: 1, featureKey: 1 }, { unique: true })

export const StaffFeature: Model<IStaffFeature> =
  mongoose.models.StaffFeature ??
  mongoose.model<IStaffFeature>('StaffFeature', StaffFeatureSchema)
