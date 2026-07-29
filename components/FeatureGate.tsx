'use client'
import { useFeature } from '@/contexts/FeatureContext'
import type { FeatureKey } from '@/types/features'

interface FeatureGateProps {
  feature: FeatureKey
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeature(feature)
  if (!enabled) return <>{fallback}</>
  return <>{children}</>
}
