'use client'
import { FeatureGate } from '@/components/FeatureGate'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const salesData = [
  { month: 'Jan', revenue: 42000 }, { month: 'Feb', revenue: 58000 },
  { month: 'Mar', revenue: 51000 }, { month: 'Apr', revenue: 67000 },
  { month: 'May', revenue: 74000 }, { month: 'Jun', revenue: 88000 },
  { month: 'Jul', revenue: 95000 },
]

const topProducts = [
  { name: 'Product A', sales: 120 }, { name: 'Product B', sales: 95 },
  { name: 'Product C', sales: 80 }, { name: 'Product D', sales: 60 },
  { name: 'Product E', sales: 45 },
]

export default function ReportsPage() {
  return (
    <FeatureGate feature="reports" fallback={<LockedPage />}>
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-800">Monthly Revenue</h3></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-800">Top Products by Sales</h3></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Charts above show sample data. Connect live aggregation endpoints to display real metrics.
        </div>
      </div>
    </FeatureGate>
  )
}

function LockedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">Reports is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">Contact your administrator to enable this feature.</p>
    </div>
  )
}
