import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { Customer } from '@/models/Customer'
import { Invoice } from '@/models/Invoice'
import { Payment } from '@/models/Payment'
import { Product } from '@/models/Product'
import type { UserRole } from '@/models/User'
import { User } from '@/models/User'

export type ReportDateRangeKey = 'today' | 'thisWeek' | 'thisMonth' | 'currentFinancialYear' | 'allTime'
export type ReportPaymentModeKey = 'all' | 'cash' | 'upi' | 'card' | 'credit'
export type ReportCashierRoleValue = 'all' | `role:${UserRole}` | `staff:${string}`

export type ReportsFilters = {
  dateRange: ReportDateRangeKey
  paymentMode: ReportPaymentModeKey
  cashierRole: ReportCashierRoleValue
}

export type ReportFilterOption<T extends string = string> = {
  value: T
  label: string
}

export type ReportsFilterOptions = {
  dateRanges: ReportFilterOption<ReportDateRangeKey>[]
  paymentModes: ReportFilterOption<ReportPaymentModeKey>[]
  cashierRoles: ReportFilterOption[]
}

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple'

export type RevenueChartPoint = {
  month: string
  revenue: number
}

export type InvoiceStatusChartPoint = {
  month: string
  paid: number
  pending: number
}

export type ReportCatalogItem = {
  title: string
  description: string
  metric: string
  detail: string
  badge: BadgeVariant
  icon: 'TrendingUp' | 'FileText' | 'Boxes' | 'BadgeDollarSign' | 'ShieldCheck' | 'Receipt' | 'Banknote' | 'Wallet' | 'ArrowUpRight'
}

export type InvoiceRow = {
  invoice: string
  customer: string
  items: string
  amount: number
  status: string
}

export type OutstandingRow = {
  customer: string
  balance: number
  aging: string
}

export type ReportsPageData = {
  revenueData: RevenueChartPoint[]
  invoiceData: InvoiceStatusChartPoint[]
  totalRevenue: number
  invoiceCount: number
  customerCount: number
  productCount: number
  totals: {
    grossSales: number
    taxCollected: number
    outstandingReceivables: number
    lowStockItems: number
  }
  topProducts: Array<{ name: string; sales: number }>
  invoiceRows: InvoiceRow[]
  outstandingRows: OutstandingRow[]
  lowStockRows: Array<{
    name: string
    sku: string
    stockQty: number
    status: 'Low Stock' | 'Out of Stock'
  }>
  receivableRows: Array<{
    invoice: string
    customer: string
    amount: number
    status: string
    createdAt: string
  }>
  refundRows: Array<{
    paymentId: string
    invoice: string
    customer: string
    products: string
    amount: number
    refundedAt: string
  }>
  stockValuationRows: Array<{
    name: string
    sku: string
    stockQty: number
    unitCost: number
    stockValue: number
  }>
  reportCatalog: ReportCatalogItem[]
  filterOptions: ReportsFilterOptions
  appliedFilters: ReportsFilters
}

type InvoiceLean = {
  _id: mongoose.Types.ObjectId
  invoiceNo: string
  staffName?: string
  staffId?: mongoose.Types.ObjectId
  customerId?: mongoose.Types.ObjectId
  customerSnapshot?: { name?: string }
  items?: Array<{ name?: string; qty?: number }>
  taxAmount?: number
  discount?: number
  total?: number
  status?: string
  createdAt?: Date
}

type PaymentLean = {
  _id: mongoose.Types.ObjectId
  invoiceId: mongoose.Types.ObjectId
  amount?: number
  method?: string
  status?: string
  createdAt?: Date
}

type ProductLean = {
  name?: string
  sku?: string
  stockQty?: number
  cost?: number
}

const DEFAULT_FILTERS: ReportsFilters = {
  dateRange: 'allTime',
  paymentMode: 'all',
  cashierRole: 'all',
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Owner',
  store_admin: 'Supervisor',
  staff: 'Cashier',
}

const PAYMENT_FILTER_OPTIONS: ReportFilterOption<ReportPaymentModeKey>[] = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'credit', label: 'Credit' },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function isDateRangeKey(value: string): value is ReportDateRangeKey {
  return ['today', 'thisWeek', 'thisMonth', 'currentFinancialYear', 'allTime'].includes(value)
}

function isPaymentModeKey(value: string): value is ReportPaymentModeKey {
  return ['all', 'cash', 'upi', 'card', 'credit'].includes(value)
}

function resolveFilters(filters?: Partial<ReportsFilters>): ReportsFilters {
  const resolved: ReportsFilters = { ...DEFAULT_FILTERS }

  if (filters?.dateRange && isDateRangeKey(filters.dateRange)) {
    resolved.dateRange = filters.dateRange
  }

  if (filters?.paymentMode && isPaymentModeKey(filters.paymentMode)) {
    resolved.paymentMode = filters.paymentMode
  }

  if (filters?.cashierRole && filters.cashierRole === 'all') {
    resolved.cashierRole = 'all'
  } else if (filters?.cashierRole?.startsWith('role:') || filters?.cashierRole?.startsWith('staff:')) {
    resolved.cashierRole = filters.cashierRole
  }

  return resolved
}

function getCurrentFinancialYearLabel(now: Date) {
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`
}

function buildDateRangeOptions(now: Date): ReportFilterOption<ReportDateRangeKey>[] {
  return [
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'currentFinancialYear', label: getCurrentFinancialYearLabel(now) },
    { value: 'allTime', label: 'All Time' },
  ]
}

function getDateBounds(dateRange: ReportDateRangeKey, now: Date): { start?: Date; end: Date } {
  const end = new Date(now)

  if (dateRange === 'allTime') {
    return { end }
  }

  if (dateRange === 'today') {
    return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end }
  }

  if (dateRange === 'thisWeek') {
    const day = now.getDay()
    const distanceFromMonday = (day + 6) % 7
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceFromMonday),
      end,
    }
  }

  if (dateRange === 'thisMonth') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end }
  }

  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return { start: new Date(fyStartYear, 3, 1), end }
}

function makeDateFieldFilter(
  field: string,
  bounds: { start?: Date; end: Date }
): Record<string, { $gte?: Date; $lte: Date }> {
  if (!bounds.start) {
    return {}
  }

  return {
    [field]: {
      $gte: bounds.start,
      $lte: bounds.end,
    },
  }
}

function getPaymentMethodFilter(paymentMode: ReportPaymentModeKey): string[] {
  if (paymentMode === 'cash') return ['cash']
  if (paymentMode === 'upi') return ['upi']
  if (paymentMode === 'card') return ['razorpay']
  return []
}

function getMonthMeta(startDate: Date, endDate: Date) {
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  const months: Date[] = []
  const cursor = new Date(startMonth)
  while (cursor <= endMonth) {
    months.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  // Keep charts readable on very old tenants.
  const capped = months.length > 24 ? months.slice(months.length - 24) : months
  return capped.map((date) => ({
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleString('en-IN', { month: 'short' }),
    start: date,
  }))
}

function safeObjectId(value: string) {
  try {
    return new mongoose.Types.ObjectId(value)
  } catch {
    return null
  }
}

export async function getDashboardReportsData(
  tenantId: string,
  filters?: Partial<ReportsFilters>
): Promise<ReportsPageData> {
  await connectDB()

  const now = new Date()
  const appliedFilters = resolveFilters(filters)
  const dateBounds = getDateBounds(appliedFilters.dateRange, now)
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId)

  const [tenantUsers, productRows, productCount, customerCount] = await Promise.all([
    User.find({ tenantId: tenantObjectId, active: true }).select({ _id: 1, name: 1, role: 1 }).lean(),
    Product.find({ tenantId: tenantObjectId, active: true }).sort({ stockQty: 1 }).lean(),
    Product.countDocuments({ tenantId: tenantObjectId, active: true }),
    Customer.countDocuments({ tenantId: tenantObjectId }),
  ])

  const cashierOptions: ReportFilterOption[] = [{ value: 'all', label: 'All' }]
  const seenRoles = new Set<UserRole>()
  tenantUsers.forEach((user) => {
    if (!seenRoles.has(user.role)) {
      seenRoles.add(user.role)
      cashierOptions.push({ value: `role:${user.role}`, label: `Role: ${ROLE_LABELS[user.role]}` })
    }
  })

  tenantUsers
    .slice()
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
    .forEach((user) => {
      cashierOptions.push({ value: `staff:${String(user._id)}`, label: String(user.name ?? 'Unknown') })
    })

  const invoiceFilter: Record<string, unknown> = {
    tenantId: tenantObjectId,
    ...makeDateFieldFilter('createdAt', dateBounds),
  }

  if (appliedFilters.cashierRole.startsWith('staff:')) {
    const staffId = safeObjectId(appliedFilters.cashierRole.replace('staff:', ''))
    if (staffId) {
      invoiceFilter.staffId = staffId
    }
  }

  if (appliedFilters.cashierRole.startsWith('role:')) {
    const role = appliedFilters.cashierRole.replace('role:', '') as UserRole
    const roleUserIds = tenantUsers.filter((user) => user.role === role).map((user) => user._id)
    invoiceFilter.staffId = { $in: roleUserIds.length ? roleUserIds : [new mongoose.Types.ObjectId()] }
  }

  const invoices = (await Invoice.find(invoiceFilter)
    .sort({ createdAt: -1 })
    .lean()) as unknown as InvoiceLean[]

  const invoiceById = new Map<string, InvoiceLean>()
  invoices.forEach((invoice) => {
    invoiceById.set(String(invoice._id), invoice)
  })

  const invoiceIds = invoices.map((invoice) => invoice._id)
  const capturedPayments = invoiceIds.length
    ? ((await Payment.find({
        tenantId: tenantObjectId,
        status: 'captured',
        invoiceId: { $in: invoiceIds },
        ...makeDateFieldFilter('createdAt', dateBounds),
      }).lean()) as unknown as PaymentLean[])
    : []

  const refundedPayments = invoiceIds.length
    ? ((await Payment.find({
        tenantId: tenantObjectId,
        status: 'refunded',
        invoiceId: { $in: invoiceIds },
        ...makeDateFieldFilter('createdAt', dateBounds),
      }).lean()) as unknown as PaymentLean[])
    : []

  let filteredInvoices = invoices
  let filteredCapturedPayments = capturedPayments
  let filteredRefundedPayments = refundedPayments

  if (appliedFilters.paymentMode === 'credit') {
    filteredInvoices = invoices.filter((invoice) => ['sent', 'overdue'].includes(String(invoice.status ?? '')))
    const allowedInvoiceIds = new Set(filteredInvoices.map((invoice) => String(invoice._id)))
    filteredCapturedPayments = capturedPayments.filter((payment) => allowedInvoiceIds.has(String(payment.invoiceId)))
    filteredRefundedPayments = refundedPayments.filter((payment) => allowedInvoiceIds.has(String(payment.invoiceId)))
  } else if (appliedFilters.paymentMode !== 'all') {
    const allowedMethods = new Set(getPaymentMethodFilter(appliedFilters.paymentMode))
    const allowedInvoiceIds = new Set(
      capturedPayments
        .filter((payment) => allowedMethods.has(String(payment.method ?? '')))
        .map((payment) => String(payment.invoiceId))
    )

    filteredInvoices = invoices.filter((invoice) => allowedInvoiceIds.has(String(invoice._id)))
    filteredCapturedPayments = capturedPayments.filter(
      (payment) => allowedInvoiceIds.has(String(payment.invoiceId)) && allowedMethods.has(String(payment.method ?? ''))
    )
    filteredRefundedPayments = refundedPayments.filter(
      (payment) => allowedInvoiceIds.has(String(payment.invoiceId)) && allowedMethods.has(String(payment.method ?? ''))
    )
  }

  const earliestDate = filteredInvoices.reduce<Date | null>((earliest, invoice) => {
    const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : null
    if (!createdAt) return earliest
    if (!earliest || createdAt < earliest) return createdAt
    return earliest
  }, null)

  const monthMeta = getMonthMeta(dateBounds.start ?? earliestDate ?? new Date(now.getFullYear(), now.getMonth() - 6, 1), now)

  const revenueMap = new Map<string, RevenueChartPoint>()
  monthMeta.forEach(({ key, label }) => {
    revenueMap.set(key, { month: label, revenue: 0 })
  })

  filteredCapturedPayments.forEach((payment) => {
    if (!payment.createdAt) return
    const key = `${new Date(payment.createdAt).getFullYear()}-${String(new Date(payment.createdAt).getMonth() + 1).padStart(2, '0')}`
    const point = revenueMap.get(key)
    if (point) {
      point.revenue += Number(payment.amount ?? 0)
    }
  })

  const invoiceMap = new Map<string, InvoiceStatusChartPoint>()
  monthMeta.forEach(({ key, label }) => {
    invoiceMap.set(key, { month: label, paid: 0, pending: 0 })
  })

  filteredInvoices.forEach((invoice) => {
    if (!invoice.createdAt) return
    const key = `${new Date(invoice.createdAt).getFullYear()}-${String(new Date(invoice.createdAt).getMonth() + 1).padStart(2, '0')}`
    const point = invoiceMap.get(key)
    if (!point) return

    if (invoice.status === 'paid') {
      point.paid += 1
    } else if (['draft', 'sent', 'overdue'].includes(String(invoice.status ?? ''))) {
      point.pending += 1
    }
  })

  const invoiceRowsForTable = filteredInvoices.slice(0, 6).map((invoice) => ({
    invoice: invoice.invoiceNo,
    customer: invoice.customerSnapshot?.name ?? 'Unknown customer',
    items: `${invoice.items?.length ?? 0} item${(invoice.items?.length ?? 0) === 1 ? '' : 's'}`,
    amount: Number(invoice.total ?? 0),
    status: String(invoice.status ?? 'draft'),
  }))

  const outstandingMap = new Map<string, { balance: number; count: number }>()
  filteredInvoices.forEach((invoice) => {
    if (!['sent', 'overdue'].includes(String(invoice.status ?? ''))) return
    const customerName = invoice.customerSnapshot?.name || 'Unknown customer'
    const existing = outstandingMap.get(customerName) ?? { balance: 0, count: 0 }
    existing.balance += Number(invoice.total ?? 0)
    existing.count += 1
    outstandingMap.set(customerName, existing)
  })

  const outstandingRows = Array.from(outstandingMap.entries())
    .map(([customer, value]) => ({
      customer,
      balance: value.balance,
      aging: value.count > 2 ? '60+ days' : '0-30 days',
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)

  const receivableRows = filteredInvoices
    .filter((invoice) => ['sent', 'overdue'].includes(String(invoice.status ?? '')))
    .map((invoice) => ({
      invoice: invoice.invoiceNo,
      customer: invoice.customerSnapshot?.name ?? 'Unknown customer',
      amount: Number(invoice.total ?? 0),
      status: String(invoice.status ?? 'sent'),
      createdAt: invoice.createdAt ? new Date(invoice.createdAt).toISOString() : new Date(0).toISOString(),
    }))
    .sort((a, b) => b.amount - a.amount)

  const topProductsMap = new Map<string, number>()
  filteredInvoices.forEach((invoice) => {
    if (!['paid', 'sent'].includes(String(invoice.status ?? ''))) return
    ;(invoice.items ?? []).forEach((item) => {
      const name = String(item.name ?? 'Unknown item')
      topProductsMap.set(name, (topProductsMap.get(name) ?? 0) + Number(item.qty ?? 0))
    })
  })

  const topProducts = Array.from(topProductsMap.entries())
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)

  const paidOrSentInvoices = filteredInvoices.filter((invoice) => ['paid', 'sent'].includes(String(invoice.status ?? '')))
  const grossSales = paidOrSentInvoices.reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0)
  const invoiceCount = paidOrSentInvoices.length
  const taxCollected = paidOrSentInvoices.reduce((sum, invoice) => sum + Number(invoice.taxAmount ?? 0), 0)
  const outstandingReceivables = outstandingRows.reduce((sum, row) => sum + row.balance, 0)
  const lowStockRows = (productRows as ProductLean[])
    .filter((product) => Number(product.stockQty ?? 0) <= 5)
    .map((product) => ({
      name: String(product.name ?? 'Unknown product'),
      sku: String(product.sku ?? '-'),
      stockQty: Number(product.stockQty ?? 0),
      status: Number(product.stockQty ?? 0) === 0 ? 'Out of Stock' as const : 'Low Stock' as const,
    }))
  const lowStockItems = lowStockRows.length

  const stockValuationRows = (productRows as ProductLean[]).map((product) => {
    const stockQty = Number(product.stockQty ?? 0)
    const unitCost = Number(product.cost ?? 0)
    return {
      name: String(product.name ?? 'Unknown product'),
      sku: String(product.sku ?? '-'),
      stockQty,
      unitCost,
      stockValue: stockQty * unitCost,
    }
  })

  const refundRows = filteredRefundedPayments
    .map((payment) => {
      const invoice = invoiceById.get(String(payment.invoiceId))
      const customer = invoice?.customerSnapshot?.name ?? 'Unknown customer'
      const products = (invoice?.items ?? []).slice(0, 3).map((item) => String(item.name ?? 'Unknown item')).join(', ') || 'Unknown item'
      return {
        paymentId: String(payment._id),
        invoice: invoice?.invoiceNo ?? '-',
        customer,
        products,
        amount: Number(payment.amount ?? 0),
        refundedAt: payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date(0).toISOString(),
      }
    })
    .sort((a, b) => new Date(b.refundedAt).getTime() - new Date(a.refundedAt).getTime())

  const refundCount = filteredRefundedPayments.length
  const refundAmount = filteredRefundedPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  const inventoryValue = stockValuationRows.reduce((sum, product) => sum + product.stockValue, 0)
  const totalRevenue = filteredCapturedPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)

  const reportCatalog: ReportCatalogItem[] = [
    {
      title: 'Sales Summary Report',
      description: 'Live revenue totals by period and payment mode from recent transactions.',
      metric: formatCurrency(grossSales),
      detail: `${monthMeta.length} month view`,
      badge: 'green',
      icon: 'TrendingUp',
    },
    {
      title: 'Invoice / Transaction Register',
      description: 'Recent invoices and their live payment status from the database.',
      metric: `${invoiceCount} invoices`,
      detail: `${invoiceRowsForTable.filter((row) => row.status === 'draft').length} pending`,
      badge: 'blue',
      icon: 'FileText',
    },
    {
      title: 'Item / Product Performance Report',
      description: 'Best selling products from invoice line items.',
      metric: topProducts[0]?.name ?? 'No sales yet',
      detail: `${topProducts[0]?.sales ?? 0} units sold`,
      badge: 'purple',
      icon: 'Boxes',
    },
    {
      title: 'Discount & Adjustments Report',
      description: 'Discount values captured from invoice records.',
      metric: formatCurrency(filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.discount ?? 0), 0)),
      detail: 'From invoice data',
      badge: 'yellow',
      icon: 'BadgeDollarSign',
    },
    {
      title: 'Tax Summary Report',
      description: 'Tax collected from the latest invoice activity.',
      metric: formatCurrency(taxCollected),
      detail: 'Current tenant view',
      badge: 'blue',
      icon: 'ShieldCheck',
    },
    {
      title: 'Party-wise Tax Report',
      description: 'Customers with invoice records mapped into this tenant ledger.',
      metric: `${customerCount} parties`,
      detail: 'From customer ledger',
      badge: 'gray',
      icon: 'Receipt',
    },
    {
      title: 'Day-End / Z-Report',
      description: 'Captured payments and settlement totals for the tenant.',
      metric: formatCurrency(totalRevenue),
      detail: 'Captured payments',
      badge: 'green',
      icon: 'Banknote',
    },
    {
      title: 'Accounts Receivable Report',
      description: 'Outstanding balances derived from unpaid and overdue invoices.',
      metric: formatCurrency(outstandingReceivables),
      detail: `${receivableRows.length} invoices pending`,
      badge: 'red',
      icon: 'Wallet',
    },
    {
      title: 'Refund & Return Report',
      description: 'Refunded payments recorded for the tenant.',
      metric: `${refundCount} refunds`,
      detail: formatCurrency(refundAmount),
      badge: 'red',
      icon: 'ArrowUpRight',
    },
    {
      title: 'Low Stock / Out-of-Stock Report',
      description: 'Products with low stock levels in the active inventory.',
      metric: `${lowStockItems} items low`,
      detail: `${lowStockRows.filter((product) => product.status === 'Out of Stock').length} out of stock`,
      badge: 'yellow',
      icon: 'Boxes',
    },
    {
      title: 'Stock Valuation Report',
      description: 'Inventory valuation from current stock levels and costs.',
      metric: formatCurrency(inventoryValue),
      detail: `${productCount} active products`,
      badge: 'purple',
      icon: 'Receipt',
    },
  ]

  return {
    revenueData: Array.from(revenueMap.values()),
    invoiceData: Array.from(invoiceMap.values()),
    totalRevenue: totalRevenue || grossSales,
    invoiceCount,
    customerCount,
    productCount,
    totals: {
      grossSales,
      taxCollected,
      outstandingReceivables,
      lowStockItems,
    },
    topProducts,
    invoiceRows: invoiceRowsForTable,
    outstandingRows,
    lowStockRows,
    receivableRows,
    refundRows,
    stockValuationRows,
    reportCatalog,
    filterOptions: {
      dateRanges: buildDateRangeOptions(now),
      paymentModes: PAYMENT_FILTER_OPTIONS,
      cashierRoles: cashierOptions,
    },
    appliedFilters,
  }
}
