import { connectDB } from './db'
import { FeatureFlag } from '@/models/FeatureFlag'
import { TenantFeature } from '@/models/TenantFeature'
import { ALL_FEATURE_KEYS, FEATURE_META, type FeatureKey } from '@/types/features'

export async function hasFeature(tenantId: string, key: FeatureKey): Promise<boolean> {
  await connectDB()

  const tenantFeature = await TenantFeature.findOne({ tenantId, featureKey: key }).lean()
  if (tenantFeature !== null) return tenantFeature.enabled

  const flag = await FeatureFlag.findOne({ key }).lean()
  return flag?.globalEnabled ?? false
}

export async function getTenantFeatures(
  tenantId: string
): Promise<Record<FeatureKey, boolean>> {
  await connectDB()

  const [flags, tenantOverrides] = await Promise.all([
    FeatureFlag.find().lean(),
    TenantFeature.find({ tenantId }).lean(),
  ])

  const overrideMap = new Map(tenantOverrides.map((t) => [t.featureKey, t.enabled]))

  const result = {} as Record<FeatureKey, boolean>
  for (const key of ALL_FEATURE_KEYS) {
    const flag = flags.find((f) => f.key === key)
    if (overrideMap.has(key)) {
      result[key] = overrideMap.get(key)!
    } else {
      result[key] = flag?.globalEnabled ?? false
    }
  }
  return result
}

export async function setTenantFeature(
  tenantId: string,
  featureKey: FeatureKey,
  enabled: boolean,
  enabledBy: string
): Promise<void> {
  await connectDB()
  await TenantFeature.findOneAndUpdate(
    { tenantId, featureKey },
    { enabled, enabledAt: enabled ? new Date() : undefined, enabledBy: enabled ? enabledBy : undefined },
    { upsert: true, new: true }
  )
}

export type TenantFeaturesMap = Record<FeatureKey, boolean>

export { ALL_FEATURE_KEYS, FEATURE_META }
