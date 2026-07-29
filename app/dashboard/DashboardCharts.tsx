'use client'
import useSWR from 'swr'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Placeholder chart data — replace with real aggregation endpoint
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const revenueData = MONTHS.map((month, i) => ({
  month,
  revenue: Math.floor(Math.random() * 50000 + 20000 * (i + 1) * 0.3),
}))
const invoiceData = MONTHS.map((month) => ({
  month,
  paid: Math.floor(Math.random() * 20 + 10),
  pending: Math.floor(Math.random() * 10 + 2),
}))

export function DashboardCharts({ tenantId }: { tenantId: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-800">Revenue (last 7 months)</h3>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData}>
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
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-800">Invoice Status (last 7 months)</h3>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={invoiceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="paid" fill="#22c55e" radius={[4, 4, 0, 0]} name="Paid" />
              <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  )
}
