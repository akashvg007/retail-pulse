'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BadgeDollarSign, Banknote, Boxes, FileText, Receipt, ShieldCheck, TrendingUp, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { ReportsPageData } from '@/lib/reports-data'

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
  const [liveData, setLiveData] = useState(reportData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeReportTitle, setActiveReportTitle] = useState<string | null>(null)

  const [selectedRange, setSelectedRange] = useState(reportData.appliedFilters.dateRange)
  const [selectedPayment, setSelectedPayment] = useState(reportData.appliedFilters.paymentMode)
  const [selectedCashier, setSelectedCashier] = useState(reportData.appliedFilters.cashierRole)

  useEffect(() => {
    const hasFilterChanged =
      selectedRange !== liveData.appliedFilters.dateRange ||
      selectedPayment !== liveData.appliedFilters.paymentMode ||
      selectedCashier !== liveData.appliedFilters.cashierRole

    if (!hasFilterChanged) return

    const controller = new AbortController()

    const refreshData = async () => {
      setIsRefreshing(true)
      try {
        const params = new URLSearchParams({
          dateRange: selectedRange,
          paymentMode: selectedPayment,
          cashierRole: selectedCashier,
        })
        const response = await fetch(`/api/reports?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) return

        const payload = (await response.json()) as { data?: ReportsPageData }
        if (payload.data) {
          setLiveData(payload.data)
        }
      } finally {
        setIsRefreshing(false)
      }
    }

    void refreshData()

    return () => controller.abort()
  }, [selectedCashier, selectedPayment, selectedRange, liveData.appliedFilters.cashierRole, liveData.appliedFilters.dateRange, liveData.appliedFilters.paymentMode])

  const chartData = useMemo(() => {
    const data = liveData.revenueData.map((row) => ({ month: row.month, revenue: row.revenue }))
    return data
  }, [liveData.revenueData])

  const topProducts = useMemo(() => liveData.topProducts, [liveData.topProducts])

  const dateRangeLabel =
    liveData.filterOptions.dateRanges.find((range) => range.value === selectedRange)?.label ?? 'This Month'
  const paymentLabel =
    liveData.filterOptions.paymentModes.find((mode) => mode.value === selectedPayment)?.label ?? 'All'

  const activeReport = useMemo(
    () => liveData.reportCatalog.find((item) => item.title === activeReportTitle) ?? null,
    [activeReportTitle, liveData.reportCatalog]
  )

  const filtersSummary = `${dateRangeLabel} • ${paymentLabel}`

  const reportModalBody = useMemo(() => {
    if (!activeReport) return null

    const baseSummary = (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <p>
          <span className="font-semibold text-gray-900">Selected filters:</span> {filtersSummary}
        </p>
      </div>
    )

    if (activeReport.title === 'Sales Summary Report') {
      return (
        <div className="space-y-4">
          {baseSummary}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Gross Sales</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(liveData.totals.grossSales)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Tax Collected</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(liveData.totals.taxCollected)}</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {liveData.revenueData.map((row) => (
                  <tr key={row.month} className="border-b border-gray-100 last:border-none">
                    <td className="px-3 py-2 text-gray-900">{row.month}</td>
                    <td className="px-3 py-2">{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeReport.title === 'Invoice / Transaction Register') {
      return (
        <div className="space-y-4">
          {baseSummary}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveData.invoiceRows.map((row) => (
                  <tr key={row.invoice} className="border-b border-gray-100 last:border-none">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.invoice}</td>
                    <td className="px-3 py-2">{row.customer}</td>
                    <td className="px-3 py-2">{row.items}</td>
                    <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.status === 'paid' ? 'green' : row.status === 'cancelled' ? 'red' : 'blue'}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeReport.title === 'Item / Product Performance Report') {
      return (
        <div className="space-y-4">
          {baseSummary}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Units Sold</th>
                </tr>
              </thead>
              <tbody>
                {liveData.topProducts.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100 last:border-none">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="px-3 py-2">{row.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeReport.title === 'Accounts Receivable Report') {
      return (
        <div className="space-y-4">
          {baseSummary}
          <div className="rounded-lg border border-gray-200 p-3 text-sm">
            <p className="text-gray-600">Expected receivable total</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(liveData.totals.outstandingReceivables)}</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Balance</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {liveData.receivableRows.map((row) => (
                  <tr key={`${row.invoice}-${row.customer}`} className="border-b border-gray-100 last:border-none">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.invoice}</td>
                    <td className="px-3 py-2">{row.customer}</td>
                    <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.status === 'overdue' ? 'red' : 'yellow'}>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-2">{new Date(row.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeReport.title === 'Tax Summary Report') {
      const taxPercent = liveData.totals.grossSales > 0 ? (liveData.totals.taxCollected / liveData.totals.grossSales) * 100 : 0
      return (
        <div className="space-y-4">
          {baseSummary}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Tax Collected</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(liveData.totals.taxCollected)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Effective Tax %</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{taxPercent.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )
    }

    if (activeReport.title === 'Low Stock / Out-of-Stock Report') {
      return (
        <div className="space-y-4">
          {baseSummary}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Stock Qty</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveData.lowStockRows.map((row) => (
                  <tr key={`${row.sku}-${row.name}`} className="border-b border-gray-100 last:border-none">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="px-3 py-2">{row.sku}</td>
                    <td className="px-3 py-2">{row.stockQty}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.status === 'Out of Stock' ? 'red' : 'yellow'}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeReport.title === 'Refund & Return Report') {
      return (
        <div className="space-y-4">
          {baseSummary}
          <div className="rounded-lg border border-gray-200 p-3 text-sm">
            <p className="text-gray-600">Total refunded amount</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(liveData.refundRows.reduce((sum, row) => sum + row.amount, 0))}
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Products</th>
                  <th className="px-3 py-2">Refund Amount</th>
                  <th className="px-3 py-2">Refund Date</th>
                </tr>
              </thead>
              <tbody>
                {liveData.refundRows.map((row) => (
                  <tr key={row.paymentId} className="border-b border-gray-100 last:border-none">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.invoice}</td>
                    <td className="px-3 py-2">{row.customer}</td>
                    <td className="px-3 py-2">{row.products}</td>
                    <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                    <td className="px-3 py-2">{new Date(row.refundedAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeReport.title === 'Stock Valuation Report') {
      return (
        <div className="space-y-4">
          {baseSummary}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit Cost</th>
                  <th className="px-3 py-2">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {liveData.stockValuationRows.map((row) => (
                  <tr key={`${row.sku}-${row.name}`} className="border-b border-gray-100 last:border-none">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="px-3 py-2">{row.sku}</td>
                    <td className="px-3 py-2">{row.stockQty}</td>
                    <td className="px-3 py-2">{formatCurrency(row.unitCost)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.stockValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {baseSummary}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">{activeReport.description}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Primary Metric</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{activeReport.metric}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Detail</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{activeReport.detail}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }, [activeReport, filtersSummary, liveData.invoiceRows, liveData.lowStockRows, liveData.receivableRows, liveData.refundRows, liveData.revenueData, liveData.stockValuationRows, liveData.topProducts, liveData.totals.grossSales, liveData.totals.outstandingReceivables, liveData.totals.taxCollected])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {liveData.filterOptions.dateRanges.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => setSelectedRange(range.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                selectedRange === range.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-sm text-gray-600">
            <span className="mr-2">Payment mode</span>
            <select
              value={selectedPayment}
              onChange={(event) => setSelectedPayment(event.target.value as ReportsPageData['appliedFilters']['paymentMode'])}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {liveData.filterOptions.paymentModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            <span className="mr-2">Cashier / role</span>
            <select
              value={selectedCashier}
              onChange={(event) => setSelectedCashier(event.target.value as ReportsPageData['appliedFilters']['cashierRole'])}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {liveData.filterOptions.cashierRoles.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isRefreshing ? <p className="mt-3 text-xs text-gray-500">Refreshing reports...</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Gross Sales', value: formatCurrency(liveData.totals.grossSales), detail: `${dateRangeLabel} • ${paymentLabel}` },
          { title: 'Tax Collected', value: formatCurrency(liveData.totals.taxCollected), detail: 'CGST + SGST + IGST' },
          { title: 'Outstanding Receivables', value: formatCurrency(liveData.totals.outstandingReceivables), detail: `${liveData.outstandingRows.length} aging groups` },
          { title: 'Low Stock Items', value: String(liveData.totals.lowStockItems), detail: 'Products below reorder threshold' },
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
          {liveData.reportCatalog.map((report) => {
            const Icon = iconMap[report.icon as keyof typeof iconMap]
            return (
              <button
                key={report.title}
                type="button"
                onClick={() => setActiveReportTitle(report.title)}
                className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
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
              </button>
            )
          })}
        </div>
      </div>

      <Modal
        open={Boolean(activeReport)}
        onClose={() => setActiveReportTitle(null)}
        title={activeReport?.title}
        className="max-w-3xl"
      >
        {reportModalBody}
      </Modal>

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
                  {liveData.invoiceRows.map((row) => (
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
                  {liveData.outstandingRows.map((row) => (
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
