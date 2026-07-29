import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getTenantFeatures } from '@/lib/features'
import { Invoice } from '@/models/Invoice'
import { Customer } from '@/models/Customer'
import { Product } from '@/models/Product'
import { Payment } from '@/models/Payment'
import { KPICard } from '@/components/KPICard'
import { FeatureGate } from '@/components/FeatureGate'
import { DashboardCharts } from './DashboardCharts'
import { FileText, Users, Package, DollarSign } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  const tenantId = session?.user?.tenantId

  let totalRevenue = 0
  let invoiceCount = 0
  let customerCount = 0
  let productCount = 0

  console.log('tenantId:', tenantId)

  if (tenantId) {
    await connectDB()
    const features = await getTenantFeatures(tenantId)

    const [invoiceAgg, customers, products, paymentAgg] = await Promise.all([
      features.invoicing
        ? Invoice.aggregate([
            { $match: { tenantId, status: { $in: ['paid', 'sent'] } } },
            { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } },
          ])
        : Promise.resolve([]),
      features.crm ? Customer.countDocuments({ tenantId }) : Promise.resolve(0),
      features.inventory ? Product.countDocuments({ tenantId, active: true }) : Promise.resolve(0),
      features.payments
        ? Payment.aggregate([
            { $match: { tenantId, status: 'captured' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ])
        : Promise.resolve([]),
    ])

    invoiceCount = invoiceAgg[0]?.count ?? 0
    customerCount = typeof customers === 'number' ? customers : 0
    productCount = typeof products === 'number' ? products : 0
    totalRevenue = paymentAgg[0]?.total ?? invoiceAgg[0]?.revenue ?? 0
  }

  const isSuper = session?.user?.role === 'super_admin'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
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
        <DashboardCharts tenantId={tenantId ?? ''} />
      </FeatureGate>

      {!tenantId && isSuper && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <h2 className="font-semibold text-indigo-900">Super Admin Console</h2>
          <p className="text-sm text-indigo-700 mt-1">
            Manage tenants and feature flags from the Admin section in the sidebar.
          </p>
        </div>
      )}
    </div>
  )
}
