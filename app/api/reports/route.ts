import { NextRequest, NextResponse } from 'next/server'
import { getDashboardReportsData } from '@/lib/reports-data'
import { requireAuth, requireFeature } from '@/lib/tenant'
import type {
  ReportCashierRoleValue,
  ReportDateRangeKey,
  ReportPaymentModeKey,
} from '@/lib/reports-data'

const DATE_RANGE_VALUES: ReportDateRangeKey[] = [
  'today',
  'thisWeek',
  'thisMonth',
  'currentFinancialYear',
  'allTime',
]

const PAYMENT_MODE_VALUES: ReportPaymentModeKey[] = ['all', 'cash', 'upi', 'card', 'credit']

export async function GET(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'reports')
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const rawDateRange = searchParams.get('dateRange')
  const rawPaymentMode = searchParams.get('paymentMode')
  const rawCashierRole = searchParams.get('cashierRole')

  const dateRange: ReportDateRangeKey | undefined =
    rawDateRange && DATE_RANGE_VALUES.includes(rawDateRange as ReportDateRangeKey)
      ? (rawDateRange as ReportDateRangeKey)
      : undefined

  const paymentMode: ReportPaymentModeKey | undefined =
    rawPaymentMode && PAYMENT_MODE_VALUES.includes(rawPaymentMode as ReportPaymentModeKey)
      ? (rawPaymentMode as ReportPaymentModeKey)
      : undefined

  const cashierRole: ReportCashierRoleValue | undefined =
    rawCashierRole && (rawCashierRole === 'all' || rawCashierRole.startsWith('role:') || rawCashierRole.startsWith('staff:'))
      ? (rawCashierRole as ReportCashierRoleValue)
      : undefined

  const reportData = await getDashboardReportsData(ctx.tenantId, {
    dateRange,
    paymentMode,
    cashierRole,
  })

  return NextResponse.json({ data: reportData })
}
