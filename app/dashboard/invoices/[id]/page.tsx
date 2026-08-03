'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Badge, invoiceStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Send, Printer, CheckCircle2, RotateCcw } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(`/api/invoices/${id}`, fetcher)
  const { data: customersResponse } = useSWR('/api/customers?limit=100', fetcher)
  const [customerSaving, setCustomerSaving] = useState(false)
  const invoice = data?.data
  const customers = Array.isArray(customersResponse?.data) ? customersResponse.data : []

  async function sendInvoice() {
    await fetch(`/api/invoices/${id}/send`, { method: 'POST' })
    mutate()
  }

  async function togglePaidStatus() {
    if (!invoice) return
    const nextStatus = invoice.status === 'paid' ? 'sent' : 'paid'
    await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    mutate()
  }

  async function updateInvoiceCustomer(customerId: string) {
    if (!invoice) return
    setCustomerSaving(true)
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customerId || undefined }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error ?? 'Unable to update customer')
      }

      mutate()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to update customer')
    } finally {
      setCustomerSaving(false)
    }
  }

  return (
    <FeatureGate feature="invoicing" fallback={<LockedPage />}>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Invoice Detail</h1>
          </div>
          {invoice && (
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </Button>
          )}
        </div>

        {isLoading && <p className="text-gray-500">Loading…</p>}
        {!isLoading && !invoice && <p className="text-red-500">Invoice not found.</p>}

        {invoice && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <p className="text-2xl font-bold text-gray-900">{invoice.invoiceNo}</p>
                <p className="text-sm text-gray-500 mt-1">Issued {formatDate(invoice.createdAt)}</p>
                <p className="text-sm text-gray-500 mt-1">Issued by {invoice.staffName}</p>
                {invoice.dueDate && (
                  <p className="text-sm text-gray-500">Due {formatDate(invoice.dueDate)}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={invoiceStatusBadge(invoice.status)}>{invoice.status}</Badge>
                {invoice.status === 'draft' && (
                  <Button size="sm" onClick={sendInvoice} className="print:hidden">
                    <Send size={14} /> Send
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={togglePaidStatus} className="print:hidden">
                  {invoice.status === 'paid' ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                  {invoice.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                </Button>
              </div>
            </div>

            {/* Customer */}
            <div className="p-6 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bill To</p>
                <select
                  value={invoice.customerId?._id ?? ''}
                  onChange={(event) => updateInvoiceCustomer(event.target.value)}
                  disabled={customerSaving}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                >
                  <option value="">No customer linked</option>
                  {customers.map((customer: { _id: string; name: string }) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="font-medium text-gray-900">
                {invoice.customerId?.name ?? invoice.customerSnapshot?.name ?? '—'}
              </p>
              {(invoice.customerId?.email ?? invoice.customerSnapshot?.email) && (
                <p className="text-sm text-gray-500">
                  {invoice.customerId?.email ?? invoice.customerSnapshot?.email}
                </p>
              )}
              {(invoice.customerId?.gstNumber ?? invoice.customerSnapshot?.gstNumber) && (
                <p className="text-sm text-gray-500">
                  GST: {invoice.customerId?.gstNumber ?? invoice.customerSnapshot?.gstNumber}
                </p>
              )}
            </div>

            {/* Line items */}
            <div className="p-6 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Items</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Price</th>
                    <th className="pb-2 font-medium text-right">Tax</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items as { name: string; qty: number; price: number; taxRate: number; total: number }[]).map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-900">{item.name}</td>
                      <td className="py-2 text-right text-gray-700">{item.qty}</td>
                      <td className="py-2 text-right text-gray-700">{formatCurrency(item.price)}</td>
                      <td className="py-2 text-right text-gray-500">{item.taxRate}%</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="p-6 flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="px-6 pb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </FeatureGate>
  )
}

function LockedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">Invoicing is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">Contact your administrator to enable this feature.</p>
    </div>
  )
}
