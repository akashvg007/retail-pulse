import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { Customer } from '@/models/Customer'
import { Invoice } from '@/models/Invoice'
import { Payment } from '@/models/Payment'
import { Product } from '@/models/Product'

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
  reportCatalog: ReportCatalogItem[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function getMonthMeta() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(new Date().getFullYear(), new Date().getMonth() - (6 - index), 1)
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleString('en-IN', { month: 'short' }),
      start: new Date(date.getFullYear(), date.getMonth(), 1),
    }
  })
}

export async function getDashboardReportsData(tenantId: string): Promise<ReportsPageData> {
  await connectDB()

  const tenantObjectId = new mongoose.Types.ObjectId(tenantId)
  const monthMeta = getMonthMeta()
  const startDate = monthMeta[0]?.start ?? new Date()

  const [revenueRows, invoiceRows, paymentAgg, invoiceAgg, customerCount, productCount, productRows, recentInvoices] = await Promise.all([
    Payment.aggregate([
      { $match: { tenantId: tenantObjectId, status: 'captured', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]),
    Invoice.aggregate([
      { $match: { tenantId: tenantObjectId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]),
    Payment.aggregate([
      { $match: { tenantId: tenantObjectId, status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Invoice.aggregate([
      { $match: { tenantId: tenantObjectId, status: { $in: ['paid', 'sent'] } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]),
    Customer.countDocuments({ tenantId: tenantObjectId }),
    Product.countDocuments({ tenantId: tenantObjectId, active: true }),
    Product.find({ tenantId: tenantObjectId, active: true }).sort({ stockQty: 1 }).limit(8).lean(),
    Invoice.find({ tenantId: tenantObjectId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ])

  const revenueMap = new Map<string, RevenueChartPoint>()
  monthMeta.forEach(({ key, label }) => {
    revenueMap.set(key, { month: label, revenue: 0 })
  })

  revenueRows.forEach((row) => {
    const point = revenueMap.get(row._id.month)
    if (point) {
      point.revenue = row.revenue
    }
  })

  const invoiceMap = new Map<string, InvoiceStatusChartPoint>()
  monthMeta.forEach(({ key, label }) => {
    invoiceMap.set(key, { month: label, paid: 0, pending: 0 })
  })

  invoiceRows.forEach((row) => {
    const point = invoiceMap.get(row._id.month)
    if (!point) return

    if (row._id.status === 'paid') {
      point.paid = row.count
    } else if (['draft', 'sent', 'overdue'].includes(row._id.status)) {
      point.pending += row.count
    }
  })

  const invoiceRowsForTable = (recentInvoices ?? []).map((invoice) => ({
    invoice: invoice.invoiceNo,
    customer: invoice.customerSnapshot?.name ?? 'Unknown customer',
    items: `${invoice.items?.length ?? 0} item${(invoice.items?.length ?? 0) === 1 ? '' : 's'}`,
    amount: Number(invoice.total ?? 0),
    status: String(invoice.status ?? 'draft'),
  }))

  const outstandingAgg = await Invoice.aggregate([
    { $match: { tenantId: tenantObjectId, status: { $in: ['sent', 'overdue'] } } },
    {
      $group: {
        _id: {
          customer: '$customerSnapshot.name',
        },
        balance: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
    { $sort: { balance: -1 } },
    { $limit: 5 },
  ])

  const outstandingRows = outstandingAgg.map((row) => ({
    customer: row._id.customer || 'Unknown customer',
    balance: Number(row.balance ?? 0),
    aging: row.count > 2 ? '60+ days' : '0-30 days',
  }))

  const topProductsAgg = await Invoice.aggregate([
    { $match: { tenantId: tenantObjectId, status: { $in: ['paid', 'sent'] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        sales: { $sum: '$items.qty' },
      },
    },
    { $sort: { sales: -1 } },
    { $limit: 5 },
  ])

  const topProducts = topProductsAgg.map((row) => ({ name: row._id, sales: Number(row.sales ?? 0) }))

  const grossSales = invoiceAgg[0]?.revenue ?? 0
  const invoiceCount = invoiceAgg[0]?.count ?? 0
  const taxCollected = (recentInvoices ?? []).reduce((sum, invoice) => sum + Number(invoice.taxAmount ?? 0), 0)
  const outstandingReceivables = outstandingRows.reduce((sum, row) => sum + row.balance, 0)
  const lowStockItems = productRows.filter((product) => Number(product.stockQty ?? 0) <= 5).length
  const refundAgg = await Payment.aggregate([
    { $match: { tenantId: tenantObjectId, status: 'refunded' } },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
  ])
  const refundCount = refundAgg[0]?.count ?? 0
  const refundAmount = refundAgg[0]?.total ?? 0
  const inventoryValue = productRows.reduce((sum, product) => sum + Number(product.stockQty ?? 0) * Number(product.cost ?? 0), 0)

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
      metric: formatCurrency((recentInvoices ?? []).reduce((sum, invoice) => sum + Number(invoice.discount ?? 0), 0)),
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
      metric: formatCurrency(Number(paymentAgg[0]?.total ?? 0)),
      detail: 'Captured payments',
      badge: 'green',
      icon: 'Banknote',
    },
    {
      title: 'Accounts Receivable Report',
      description: 'Outstanding balances derived from unpaid and overdue invoices.',
      metric: formatCurrency(outstandingReceivables),
      detail: `${outstandingRows.length} aging buckets`,
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
      detail: `${productRows.filter((product) => Number(product.stockQty ?? 0) === 0).length} out of stock`,
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
    totalRevenue: Number(paymentAgg[0]?.total ?? invoiceAgg[0]?.revenue ?? 0),
    invoiceCount: invoiceAgg[0]?.count ?? 0,
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
    reportCatalog,
  }
}
