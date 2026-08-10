import { FeatureGate } from '@/components/FeatureGate'
import { LockedPage } from '@/components/LockedPage'
import { InventoryManagerLoader } from '@/components/inventory/InventoryManagerLoader'

export default function InventoryPage() {
  return (
    <FeatureGate feature="inventory" fallback={<LockedPage feature="Inventory" />}>
      <InventoryManagerLoader />
    </FeatureGate>
  )
}

