import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Invoice } from '@/models/Invoice'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { LockedPage } from '@/components/LockedPage'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaymentRow {
  _id: string
  invoiceNo: string
  customerId?: { name: string } | null
  customerSnapshot?: { name: string } | null
  total: number
  status: string
  updatedAt: string
}

export default async function PaymentsPage() {
  const session = await auth()
  const tenantId = session?.user?.tenantId

  let invoices: PaymentRow[] = []
  if (tenantId) {
    await connectDB()
    invoices = (await Invoice.find({ tenantId, status: 'paid' })
      .populate('customerId', 'name')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()) as unknown as PaymentRow[]
  }

  return (
    <FeatureGate feature="payments" fallback={<LockedPage feature="Payments" />}>
      <div className="space-y-4 p-4 sm:p-6">
        <h1 className="text-xl font-bold text-gray-900">Payments</h1>
        <Table
          columns={[
            { key: 'invoiceNo',from:'payment', label: 'Invoice #' },
            { key: 'customerId',from:'payment', label: 'Customer', render: (_, row) =>
              row.customerId?.name ?? row.customerSnapshot?.name ?? '—'
            },
            { key: 'total',from:'payment', label: 'Amount', render: (v) => formatCurrency(v) },
            { key: 'status',from:'payment', label: 'Status', render: () => <Badge variant="green">Paid</Badge> },
            { key: 'updatedAt',from:'payment', label: 'Date', render: (v) => formatDate(v) },
          ]}
          data={invoices}
          emptyMessage="No payments recorded yet."
        />
      </div>
    </FeatureGate>
  )
}


