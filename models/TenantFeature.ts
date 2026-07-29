import mongoose, { Schema, Document, Model } from 'mongoose'
import { ALL_FEATURE_KEYS, type FeatureKey } from '@/types/features'

export interface ITenantFeature extends Document {
  tenantId: mongoose.Types.ObjectId
  featureKey: FeatureKey
  enabled: boolean
  enabledAt?: Date
  enabledBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TenantFeatureSchema = new Schema<ITenantFeature>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    featureKey: { type: String, required: true, enum: ALL_FEATURE_KEYS },
    enabled: { type: Boolean, required: true },
    enabledAt: Date,
    enabledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

TenantFeatureSchema.index({ tenantId: 1, featureKey: 1 }, { unique: true })

export const TenantFeature: Model<ITenantFeature> =
  mongoose.models.TenantFeature ??
  mongoose.model<ITenantFeature>('TenantFeature', TenantFeatureSchema)
