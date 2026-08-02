'use client'

import { useMemo, useState } from 'react'
import { ArrowUpRight, BadgeDollarSign, Banknote, Boxes, FileText, Receipt, ShieldCheck, TrendingUp, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { ReportsPageData } from '@/lib/reports-data'

const dateRanges = ['Today', 'This Week', 'This Month', 'FY 2026-27']
const paymentModes = ['All', 'Cash', 'UPI', 'Card', 'Credit']
const cashierRoles = ['All', 'Owner', 'Cashier', 'Supervisor']

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

const iconMap = {
  TrendingUp,
  FileText,
  Boxes,
  BadgeDollarSign,
  ShieldCheck,
  Receipt,
  Banknote,
  Wallet,
  ArrowUpRight,
}

export function ReportsAnalytics({ reportData }: { reportData: ReportsPageData }) {
  const [selectedRange, setSelectedRange] = useState('This Month')
  const [selectedPayment, setSelectedPayment] = useState('All')
  const [selectedCashier, setSelectedCashier] = useState('All')

  const chartData = useMemo(() => {
    const data = reportData.revenueData.map((row) => ({ month: row.month, revenue: row.revenue }))
    return data
  }, [reportData.revenueData])

  const topProducts = useMemo(() => reportData.topProducts, [reportData.topProducts])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {dateRanges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setSelectedRange(range)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                selectedRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-sm text-gray-600">
            <span className="mr-2">Payment mode</span>
            <select
              value={selectedPayment}
              onChange={(event) => setSelectedPayment(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {paymentModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            <span className="mr-2">Cashier / role</span>
            <select
              value={selectedCashier}
              onChange={(event) => setSelectedCashier(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {cashierRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Gross Sales', value: formatCurrency(reportData.totals.grossSales), detail: `${selectedRange} • ${selectedPayment}` },
          { title: 'Tax Collected', value: formatCurrency(reportData.totals.taxCollected), detail: 'CGST + SGST + IGST' },
          { title: 'Outstanding Receivables', value: formatCurrency(reportData.totals.outstandingReceivables), detail: `${reportData.outstandingRows.length} aging groups` },
          { title: 'Low Stock Items', value: String(reportData.totals.lowStockItems), detail: 'Products below reorder threshold' },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardBody>
              <p className="text-sm text-gray-500">{stat.title}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.detail}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-800">Revenue Trend</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-800">Top Products by Sales</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sales" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Reporting Modules</h2>
          <Badge variant="gray">All major billing reports included</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reportData.reportCatalog.map((report) => {
            const Icon = iconMap[report.icon as keyof typeof iconMap]
            return (
              <div key={report.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{report.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                  </div>
                  <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{report.metric}</p>
                    <p className="text-xs text-gray-500">{report.detail}</p>
                  </div>
                  <Badge variant={report.badge}>{report.badge}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-800">Invoice / Transaction Register</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 pr-4">Customer</th>
                    <th className="pb-2 pr-4">Items</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.invoiceRows.map((row) => (
                    <tr key={row.invoice} className="border-b border-gray-100 last:border-none">
                      <td className="py-2 pr-4 font-medium text-gray-900">{row.invoice}</td>
                      <td className="py-2 pr-4">{row.customer}</td>
                      <td className="py-2 pr-4">{row.items}</td>
                      <td className="py-2 pr-4">{formatCurrency(row.amount)}</td>
                      <td className="py-2">
                        <Badge variant={row.status === 'paid' ? 'green' : row.status === 'cancelled' ? 'red' : 'blue'}>{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-800">Accounts Receivable / Outstanding</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 pr-4">Customer</th>
                    <th className="pb-2 pr-4">Balance</th>
                    <th className="pb-2">Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.outstandingRows.map((row) => (
                    <tr key={row.customer} className="border-b border-gray-100 last:border-none">
                      <td className="py-2 pr-4 font-medium text-gray-900">{row.customer}</td>
                      <td className="py-2 pr-4">{formatCurrency(row.balance)}</td>
                      <td className="py-2">
                        <Badge variant={row.aging === '60+ days' ? 'red' : 'yellow'}>{row.aging}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
