import { NextRequest, NextResponse } from 'next/server'
import { getDashboardReportsData } from '@/lib/reports-data'
import { requireAuth, requireFeature } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'reports')
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const reportData = await getDashboardReportsData(ctx.tenantId, {
    dateRange: searchParams.get('dateRange') ?? undefined,
    paymentMode: searchParams.get('paymentMode') ?? undefined,
    cashierRole: searchParams.get('cashierRole') ?? undefined,
  })

  return NextResponse.json({ data: reportData })
}
