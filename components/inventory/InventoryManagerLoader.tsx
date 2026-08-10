'use client'
import dynamic from 'next/dynamic'
import { InventorySkeleton } from './InventorySkeleton'

// ssr:false must be declared in a client component; InventoryManager uses browser APIs (file input, xlsx)
const InventoryManagerDynamic = dynamic(
  () => import('./InventoryManager').then((m) => m.InventoryManager),
  { ssr: false, loading: () => <InventorySkeleton /> }
)

export function InventoryManagerLoader() {
  return <InventoryManagerDynamic />
}
