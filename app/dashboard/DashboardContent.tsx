import dynamic from 'next/dynamic'
import { auth } from '@/lib/auth'
import { getTenantFeatures } from '@/lib/features'
import { getDashboardReportsData } from '@/lib/reports-data'
import { KPICard } from '@/components/KPICard'
import { FeatureGate } from '@/components/FeatureGate'
import { FileText, Users, Package, DollarSign } from 'lucide-react'

const DashboardChartsSection = dynamic(() => import('./DashboardCharts').then((module) => module.DashboardCharts), {
  loading: () => <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading charts…</div>,
})

type RevenueChartPoint = {
  month: string
  revenue: number
}

type InvoiceStatusChartPoint = {
  month: string
  paid: number
  pending: number
}

export async function DashboardContent() {
  const session = await auth()
  const tenantId = session?.user?.tenantId

  let totalRevenue = 0
  let invoiceCount = 0
  let customerCount = 0
  let productCount = 0
  let revenueData: RevenueChartPoint[] = []
  let invoiceData: InvoiceStatusChartPoint[] = []

  if (tenantId) {
    const features = await getTenantFeatures(tenantId)
    const reportData = await getDashboardReportsData(tenantId)

    invoiceCount = features.invoicing ? reportData.invoiceCount : 0
    customerCount = features.crm ? reportData.customerCount : 0
    productCount = features.inventory ? reportData.productCount : 0
    totalRevenue = features.payments ? reportData.totalRevenue : 0
    revenueData = reportData.revenueData
    invoiceData = reportData.invoiceData
  }

  const isSuper = session?.user?.role === 'super_admin'

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {isSuper ? 'Platform overview' : 'Your store at a glance'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FeatureGate feature="payments">
          <KPICard title="Total Revenue" value={totalRevenue} isCurrency icon={DollarSign} iconColor="text-green-600" />
        </FeatureGate>
        <FeatureGate feature="invoicing">
          <KPICard title="Invoices" value={invoiceCount} icon={FileText} iconColor="text-blue-600" />
        </FeatureGate>
        <FeatureGate feature="crm">
          <KPICard title="Customers" value={customerCount} icon={Users} iconColor="text-purple-600" />
        </FeatureGate>
        <FeatureGate feature="inventory">
          <KPICard title="Products" value={productCount} icon={Package} iconColor="text-orange-600" />
        </FeatureGate>
      </div>

      <FeatureGate feature="reports">
        <DashboardChartsSection revenueData={revenueData} invoiceData={invoiceData} />
      </FeatureGate>

      {!tenantId && isSuper && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <h2 className="font-semibold text-indigo-900">Super Admin Console</h2>
          <p className="mt-1 text-sm text-indigo-700">
            Manage tenants and feature flags from the Admin section in the sidebar.
          </p>
        </div>
      )}
    </div>
  )
}
