import mongoose, { Schema, Document, Model } from 'mongoose'
import { ALL_FEATURE_KEYS, type FeatureKey } from '@/types/features'

export interface IFeatureFlag extends Document {
  key: FeatureKey
  name: string
  description: string
  globalEnabled: boolean
  beta: boolean
  createdAt: Date
  updatedAt: Date
}

const FeatureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: { type: String, required: true, unique: true, enum: ALL_FEATURE_KEYS },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    globalEnabled: { type: Boolean, default: false },
    beta: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const FeatureFlag: Model<IFeatureFlag> =
  mongoose.models.FeatureFlag ?? mongoose.model<IFeatureFlag>('FeatureFlag', FeatureFlagSchema)
