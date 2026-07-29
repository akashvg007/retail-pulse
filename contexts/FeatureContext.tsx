'use client'
import { createContext, useContext } from 'react'
import type { FeatureKey, TenantFeaturesMap } from '@/lib/features'

const FeatureContext = createContext<TenantFeaturesMap>({} as TenantFeaturesMap)

export function FeatureProvider({
  children,
  features,
}: {
  children: React.ReactNode
  features: TenantFeaturesMap
}) {
  return <FeatureContext.Provider value={features}>{children}</FeatureContext.Provider>
}

export function useFeatures(): TenantFeaturesMap {
  return useContext(FeatureContext)
}

export function useFeature(key: FeatureKey): boolean {
  const features = useContext(FeatureContext)
  return features[key] ?? false
}
