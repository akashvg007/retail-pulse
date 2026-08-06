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

type InvoicePrintTemplate = 'standard-a4' | 'minimal-a4' | 'thermal-detailed' | 'thermal-compact'

interface InvoiceItem {
  name: string
  qty: number
  price: number
  taxRate: number
  total: number
}

interface InvoiceData {
  invoiceNo: string
  businessName?: string
  createdAt: string
  dueDate?: string
  staffName?: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | string
  customerId?: {
    _id: string
    name?: string
    email?: string
    gstNumber?: string
  } | null
  customerSnapshot?: {
    name?: string
    email?: string
    gstNumber?: string
  } | null
  items: InvoiceItem[]
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  notes?: string
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(`/api/invoices/${id}`, fetcher)
  const { data: customersResponse } = useSWR('/api/customers?limit=100', fetcher)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [printTemplate, setPrintTemplate] = useState<InvoicePrintTemplate>('standard-a4')
  const invoice = data?.data as InvoiceData | undefined
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
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Invoice Detail</h1>
          </div>
          {invoice && (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <label className="text-sm font-medium text-gray-600" htmlFor="invoice-print-template">
                Template
              </label>
              <select
                id="invoice-print-template"
                value={printTemplate}
                onChange={(event) => setPrintTemplate(event.target.value as InvoicePrintTemplate)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <option value="standard-a4">A4 - Standard</option>
                <option value="minimal-a4">A4 - Minimal</option>
                <option value="thermal-detailed">Thermal - Detailed</option>
                <option value="thermal-compact">Thermal - Compact</option>
              </select>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer size={14} /> Print
              </Button>
            </div>
          )}
        </div>

        {isLoading && <p className="text-gray-500">Loading…</p>}
        {!isLoading && !invoice && <p className="text-red-500">Invoice not found.</p>}

        {invoice && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:hidden">
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
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
            <div className="border-b border-gray-100 p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Items</p>
              <div className="overflow-x-auto">
                <table className="min-w-155 w-full text-sm">
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
            </div>

            {/* Totals */}
            <div className="flex justify-end p-4 sm:p-6">
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

            <InvoicePrintPreview invoice={invoice} template={printTemplate} />
          </>
        )}
      </div>
    </FeatureGate>
  )
}

function InvoicePrintPreview({
  invoice,
  template,
}: {
  invoice: InvoiceData
  template: InvoicePrintTemplate
}) {
  const businessName = invoice.businessName?.trim() || 'Your Shop'
  const customerName = invoice.customerId?.name ?? invoice.customerSnapshot?.name
  const customerEmail = invoice.customerId?.email ?? invoice.customerSnapshot?.email
  const customerGst = invoice.customerId?.gstNumber ?? invoice.customerSnapshot?.gstNumber

  if (template === 'standard-a4') {
    return (
      <div className="hidden print:block print:mx-auto print:max-w-3xl print:bg-white print:rounded-none print:shadow-none print:border-0">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">{businessName}</p>
              <p className="text-2xl font-bold text-gray-900">Invoice</p>
              <p className="text-sm text-gray-500 mt-1">{invoice.invoiceNo}</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Issued {formatDate(invoice.createdAt)}</p>
              {invoice.dueDate && <p>Due {formatDate(invoice.dueDate)}</p>}
              {invoice.staffName && <p>Issued by {invoice.staffName}</p>}
            </div>
          </div>
        </div>

        <div className="py-4 text-sm text-gray-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bill To</p>
          <p className="mt-1 font-semibold text-gray-900">{customerName || 'Walk-in customer'}</p>
          {customerEmail && <p>{customerEmail}</p>}
          {customerGst && <p>GST: {customerGst}</p>}
        </div>

        <table className="w-full text-sm border-y border-gray-200">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium text-right">Price</th>
              <th className="py-2 font-medium text-right">Tax</th>
              <th className="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2 text-gray-900">{item.name}</td>
                <td className="py-2 text-right">{item.qty}</td>
                <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                <td className="py-2 text-right">{item.taxRate}%</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-64 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="mt-1 flex justify-between text-gray-700">
              <span>Tax</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
          )}
          {invoice.discount > 0 && (
            <div className="mt-1 flex justify-between text-gray-700">
              <span>Discount</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-gray-300 pt-2 font-bold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-5 text-sm text-gray-600">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
            <p className="mt-1">{invoice.notes}</p>
          </div>
        )}
      </div>
    )
  }

  if (template === 'minimal-a4') {
    return (
      <div className="hidden print:block print:mx-auto print:max-w-3xl print:bg-white print:rounded-none print:shadow-none print:border-0">
        <div className="flex items-end justify-between border-b border-gray-300 pb-3">
          <div>
            <p className="text-base font-semibold text-gray-900">{businessName}</p>
            <h2 className="text-xl font-bold tracking-tight">{invoice.invoiceNo}</h2>
          </div>
          <p className="text-xs text-gray-600">{formatDate(invoice.createdAt)}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
          <div>
            <p className="font-semibold text-gray-900">Customer</p>
            <p>{customerName || 'Walk-in customer'}</p>
            {customerEmail && <p>{customerEmail}</p>}
          </div>
          <div className="text-right">
            {invoice.dueDate && <p>Due: {formatDate(invoice.dueDate)}</p>}
            {invoice.staffName && <p>Staff: {invoice.staffName}</p>}
            <p>Status: {invoice.status}</p>
          </div>
        </div>

        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="border-y border-gray-300">
              <th className="py-1.5 text-left font-semibold">Item</th>
              <th className="py-1.5 text-right font-semibold">Qty</th>
              <th className="py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1.5">{item.name}</td>
                <td className="py-1.5 text-right">{item.qty}</td>
                <td className="py-1.5 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 ml-auto w-48 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="mt-1 flex justify-between">
              <span>Tax</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
          )}
          {invoice.discount > 0 && (
            <div className="mt-1 flex justify-between">
              <span>Discount</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div className="mt-1.5 flex justify-between border-t border-gray-300 pt-1.5 font-bold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>
    )
  }

  if (template === 'thermal-detailed') {
    return (
      <div className="hidden print:flex print:justify-center">
        <div className="thermal-print thermal-print-detailed border border-gray-200 bg-white p-2 font-mono text-[11px] text-black leading-tight">
          <p className="text-center text-sm font-bold uppercase">{businessName}</p>
          <p className="text-center text-base font-bold">INVOICE</p>
          <p className="text-center">{invoice.invoiceNo}</p>
          <p className="mt-1 text-center">{formatDate(invoice.createdAt)}</p>
          <p className="text-center">Status: {invoice.status.toUpperCase()}</p>

          <div className="my-2 border-t border-dashed border-black" />

          <p className="font-bold">Bill To</p>
          <p>{customerName || 'Walk-in customer'}</p>
          {customerGst && <p>GST: {customerGst}</p>}

          <div className="my-2 border-t border-dashed border-black" />

          {invoice.items.map((item, i) => (
            <div key={i} className="py-1">
              <p className="font-semibold">{item.name}</p>
              <div className="flex justify-between">
                <span>
                  {item.qty} x {formatCurrency(item.price)}
                </span>
                <span>{formatCurrency(item.total)}</span>
              </div>
              {item.taxRate > 0 && <p className="text-[10px]">Tax: {item.taxRate}%</p>}
            </div>
          ))}

          <div className="my-2 border-t border-dashed border-black" />

          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-black pt-1 font-bold text-[12px]">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <>
              <div className="my-2 border-t border-dashed border-black" />
              <p className="font-bold">Notes</p>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="hidden print:flex print:justify-center">
      <div className="thermal-print thermal-print-compact border border-gray-200 bg-white px-2 py-1.5 font-mono text-[10px] text-black leading-tight">
        <div className="text-center">
          <p className="font-bold uppercase">{businessName}</p>
          <p className="font-bold">{invoice.invoiceNo}</p>
          <p>{formatDate(invoice.createdAt)}</p>
        </div>

        <div className="my-1 border-t border-dashed border-black" />

        {invoice.items.map((item, i) => (
          <div key={i} className="flex justify-between py-0.5">
            <span className="max-w-[60%] truncate">{item.name}</span>
            <span>
              {item.qty} x {formatCurrency(item.price)}
            </span>
          </div>
        ))}

        <div className="my-1 border-t border-dashed border-black" />

        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[11px]">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>
    </div>
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
