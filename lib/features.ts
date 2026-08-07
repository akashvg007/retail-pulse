import { connectDB } from './db'
import { FeatureFlag } from '@/models/FeatureFlag'
import { TenantFeature } from '@/models/TenantFeature'
import { StaffFeature } from '@/models/StaffFeature'
import { ALL_FEATURE_KEYS, FEATURE_META, type FeatureKey } from '@/types/features'

export type TenantFeaturesMap = Record<FeatureKey, boolean>

interface FeatureOpts {
  userId?: string
  role?: string
}

/** Resolves feature access across all 3 layers: global → tenant → staff */
export async function hasFeature(
  tenantId: string,
  key: FeatureKey,
  opts?: FeatureOpts
): Promise<boolean> {
  await connectDB()

  // Layer 1+2: tenant-level (global default overridden by tenant override)
  const tenantFeature = await TenantFeature.findOne({ tenantId, featureKey: key }).lean()
  let tenantEnabled: boolean
  if (tenantFeature !== null) {
    tenantEnabled = tenantFeature.enabled
  } else {
    const flag = await FeatureFlag.findOne({ key }).lean()
    tenantEnabled = flag?.globalEnabled ?? false
  }

  if (!tenantEnabled) return false

  if (key === 'purchase_management') {
    const supplierEnabled = await hasFeature(tenantId, 'supplier_management', opts)
    if (!supplierEnabled) return false
  }

  if (key === 'purchase_bill_ocr') {
    const purchaseEnabled = await hasFeature(tenantId, 'purchase_management', opts)
    if (!purchaseEnabled) return false
  }

  // Layer 3: staff-level (only applies to staff role)
  if (opts?.role === 'staff' && opts?.userId) {
    const staffFeature = await StaffFeature.findOne({
      tenantId,
      userId: opts.userId,
      featureKey: key,
    }).lean()
    return staffFeature?.enabled ?? false
  }

  return true
}

export async function getTenantFeatures(tenantId: string): Promise<TenantFeaturesMap> {
  await connectDB()

  const [flags, tenantOverrides] = await Promise.all([
    FeatureFlag.find().lean(),
    TenantFeature.find({ tenantId }).lean(),
  ])

  const overrideMap = new Map(tenantOverrides.map((t) => [t.featureKey, t.enabled]))

  const result = {} as TenantFeaturesMap
  for (const key of ALL_FEATURE_KEYS) {
    const flag = flags.find((f) => f.key === key)
    result[key] = overrideMap.has(key) ? overrideMap.get(key)! : (flag?.globalEnabled ?? false)
  }
  result.purchase_management = result.purchase_management && result.supplier_management
  result.purchase_bill_ocr = result.purchase_bill_ocr && result.purchase_management
  return result
}

/** Returns the intersection of tenant-enabled features and staff grants. */
export async function getStaffFeatures(
  userId: string,
  tenantId: string
): Promise<TenantFeaturesMap> {
  await connectDB()

  const [tenantFeatures, staffGrants] = await Promise.all([
    getTenantFeatures(tenantId),
    StaffFeature.find({ tenantId, userId }).lean(),
  ])

  const grantMap = new Map(staffGrants.map((g) => [g.featureKey, g.enabled]))

  const result = {} as TenantFeaturesMap
  for (const key of ALL_FEATURE_KEYS) {
    // Staff can only access features the tenant has AND they've been explicitly granted
    result[key] = tenantFeatures[key] === true && (grantMap.get(key) ?? false)
  }
  result.purchase_management = result.purchase_management && result.supplier_management
  result.purchase_bill_ocr = result.purchase_bill_ocr && result.purchase_management
  return result
}

/** Bulk-sets staff feature grants, capped to features the tenant has enabled. */
export async function setStaffFeatures(
  userId: string,
  tenantId: string,
  features: Record<string, boolean>,
  grantedBy: string
): Promise<void> {
  await connectDB()
  const tenantFeatures = await getTenantFeatures(tenantId)

  await Promise.all(
    ALL_FEATURE_KEYS.map((key) => {
      // Silently ignore features not enabled for the tenant
      const enabled = features[key] === true && tenantFeatures[key] === true
      return StaffFeature.findOneAndUpdate(
        { tenantId, userId, featureKey: key },
        { $set: { enabled, ...(enabled ? { grantedAt: new Date(), grantedBy } : {}) } },
        { upsert: true }
      )
    })
  )
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
    { $set: { enabled, enabledAt: enabled ? new Date() : undefined, enabledBy: enabled ? enabledBy : undefined } },
    { upsert: true, new: true }
  )
}

export { ALL_FEATURE_KEYS, FEATURE_META }

