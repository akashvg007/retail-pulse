'use client'

import { formatCurrency, formatDate } from '@/lib/utils'

export type PurchasePrintData = {
  poNo: string
  invoiceNo: string
  invoiceDate: string
  paymentTerms: string
  status: string
  createdAt: string
  expectedDeliveryDate?: string
  notes?: string
  supplierSnapshot: {
    name: string
    code: string
    email?: string
    phone?: string
    gstNumber?: string
  }
  items: Array<{
    name: string
    hsnCode?: string
    qty: number
    unitCost?: number
    discountPercentage?: number
    discountAmount?: number
    taxRate?: number
    mrp?: number
    price?: number
    total?: number
  }>
  subtotal: number
  taxAmount: number
  total: number
  sellingPriceTotal?: number
  roundingAdjustment?: number
}

function computeSellingPriceTotal(purchase: PurchasePrintData) {
  if (typeof purchase.sellingPriceTotal === 'number') return purchase.sellingPriceTotal
  return purchase.items.reduce(
    (sum, item) => sum + Number(item.price ?? 0) * Number(item.qty ?? 0),
    0
  )
}

export default function PurchasePrintPreview({ purchase }: { purchase: PurchasePrintData }) {
  const sellingPriceTotal = computeSellingPriceTotal(purchase)

  return (
    <div className="purchase-print hidden print:block print:mx-auto print:max-w-3xl print:bg-white print:text-gray-900">
      <div className="text-center">
        <p className="text-lg font-semibold">Purchase Bill</p>
        <p className="text-sm text-gray-600">PO {purchase.poNo}</p>
      </div>

      <div className="mt-4 flex justify-between gap-6 text-sm">
        <div>
          <p className="font-semibold text-gray-900">Supplier</p>
          <p>{purchase.supplierSnapshot?.name || '—'}</p>
          {purchase.supplierSnapshot?.code ? <p>Code: {purchase.supplierSnapshot.code}</p> : null}
          {purchase.supplierSnapshot?.phone ? <p>Phone: {purchase.supplierSnapshot.phone}</p> : null}
          {purchase.supplierSnapshot?.email ? <p>Email: {purchase.supplierSnapshot.email}</p> : null}
          {purchase.supplierSnapshot?.gstNumber ? <p>GST: {purchase.supplierSnapshot.gstNumber}</p> : null}
        </div>
        <div className="text-right">
          <p>Invoice No: {purchase.invoiceNo}</p>
          <p>Invoice Date: {formatDate(purchase.invoiceDate)}</p>
          <p>Payment Terms: {purchase.paymentTerms}</p>
          <p>Status: {purchase.status.replace(/_/g, ' ')}</p>
          {purchase.expectedDeliveryDate ? (
            <p>Expected: {formatDate(purchase.expectedDeliveryDate)}</p>
          ) : null}
          <p>Created: {formatDate(purchase.createdAt)}</p>
        </div>
      </div>

      <table className="mt-4 w-full border-y border-gray-200 text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 font-medium">Item</th>
            <th className="py-1 font-medium">HSN</th>
            <th className="py-1 font-medium text-right">Qty</th>
            <th className="py-1 font-medium text-right">Purchase rate</th>
            <th className="py-1 font-medium text-right">MRP</th>
            <th className="py-1 font-medium text-right">Disc</th>
            <th className="py-1 font-medium text-right">Tax %</th>
            <th className="py-1 font-medium text-right">Selling price</th>
            <th className="py-1 font-medium text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {purchase.items.map((item, index) => (
            <tr key={`print-item-${index}`} className="border-t border-gray-100">
              <td className="py-1 text-gray-900">{item.name}</td>
              <td className="py-1 text-gray-700">{item.hsnCode || '—'}</td>
              <td className="py-1 text-right text-gray-700">{item.qty}</td>
              <td className="py-1 text-right text-gray-700">{formatCurrency(item.unitCost ?? 0)}</td>
              <td className="py-1 text-right text-gray-700">{formatCurrency(item.mrp ?? 0)}</td>
              <td className="py-1 text-right text-gray-700">
                {formatCurrency(item.discountAmount ?? 0)}
                {item.discountPercentage ? ` (${item.discountPercentage}%)` : ''}
              </td>
              <td className="py-1 text-right text-gray-700">{item.taxRate ?? 0}%</td>
              <td className="py-1 text-right text-gray-700">{formatCurrency(item.price ?? 0)}</td>
              <td className="py-1 text-right font-medium text-gray-900">{formatCurrency(item.total ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatCurrency(purchase.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Tax</span>
          <span>{formatCurrency(purchase.taxAmount)}</span>
        </div>
        {purchase.roundingAdjustment ? (
          <div className="flex justify-between">
            <span className="text-gray-600">Rounding</span>
            <span>{formatCurrency(purchase.roundingAdjustment)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
          <span>Purchase bill total</span>
          <span>{formatCurrency(purchase.total)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Selling price total</span>
          <span>{formatCurrency(sellingPriceTotal)}</span>
        </div>
      </div>

      {purchase.notes ? (
        <div className="mt-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Notes</p>
          <p className="whitespace-pre-wrap">{purchase.notes}</p>
        </div>
      ) : null}
    </div>
  )
}
