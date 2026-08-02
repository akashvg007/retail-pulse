import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { DashboardSkeleton } from './DashboardSkeleton'

const DashboardContent = dynamic(() => import('./DashboardContent').then((module) => module.DashboardContent), {
  loading: () => <DashboardSkeleton />,
})

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
