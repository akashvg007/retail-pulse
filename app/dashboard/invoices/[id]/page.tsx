"use client";
import { lazy, Suspense, useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { Badge, invoiceStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FeatureGate } from "@/components/FeatureGate";
import { LockedPage } from '@/components/LockedPage'
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  Printer,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { InvoiceData, InvoicePrintTemplate } from "../type";
import InvoicePrintPreview from "./InvoicePrintPreview";
const CustomerSelection = lazy(() => import('./CustomerSelection'));

const fetcher = (url: string) => fetch(url).then((r) => r.json());


export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR(`/api/invoices/${id}`, fetcher);
  const [printTemplate, setPrintTemplate] =
    useState<InvoicePrintTemplate>("standard-a4");
  const invoice = data?.data as InvoiceData | undefined;

  async function sendInvoice() {
    await fetch(`/api/invoices/${id}/send`, { method: "POST" });
    mutate();
  }

  async function togglePaidStatus() {
    if (!invoice) return;
    const nextStatus = invoice.status === "paid" ? "sent" : "paid";
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    mutate();
  }

  return (
    <FeatureGate feature="invoicing" fallback={<LockedPage feature="Invoicing" />}>
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Invoice Detail</h1>
          </div>
          {invoice && (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <label
                className="text-sm font-medium text-gray-600"
                htmlFor="invoice-print-template"
              >
                Template
              </label>
              <select
                id="invoice-print-template"
                value={printTemplate}
                onChange={(event) =>
                  setPrintTemplate(event.target.value as InvoicePrintTemplate)
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <option value="standard-a4">A4 - Standard</option>
                <option value="minimal-a4">A4 - Minimal</option>
                <option value="thermal-detailed">Thermal - Detailed</option>
                <option value="thermal-compact">Thermal - Compact</option>
              </select>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.print()}
              >
                <Printer size={14} /> Print
              </Button>
            </div>
          )}
        </div>

        {isLoading && <p className="text-gray-500">Loading…</p>}
        {!isLoading && !invoice && (
          <p className="text-red-500">Invoice not found.</p>
        )}

        {invoice && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:hidden">
              {/* Header */}
              <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {invoice.invoiceNo}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Issued {formatDate(invoice.createdAt)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Issued by {invoice.staffName}
                  </p>
                  {invoice.dueDate && (
                    <p className="text-sm text-gray-500">
                      Due {formatDate(invoice.dueDate)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={invoiceStatusBadge(invoice.status)}>
                    {invoice.status}
                  </Badge>
                  {invoice.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={sendInvoice}
                      className="print:hidden"
                    >
                      <Send size={14} /> Send
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={togglePaidStatus}
                    className="print:hidden"
                  >
                    {invoice.status === "paid" ? (
                      <RotateCcw size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {invoice.status === "paid" ? "Mark unpaid" : "Mark paid"}
                  </Button>
                </div>
              </div>

              {/* Customer */}
              <Suspense
                fallback={
                  <p className="p-6 text-gray-500">Loading customer…</p>
                }
              >
                <CustomerSelection invoice={invoice} id={id} mutate={mutate} />
              </Suspense>

              {/* Line items */}
              <div className="border-b border-gray-100 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Items
                </p>
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
                      {(
                        invoice.items as {
                          name: string;
                          qty: number;
                          price: number;
                          taxRate: number;
                          total: number;
                        }[]
                      ).map((item, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="py-2 text-gray-900">{item.name}</td>
                          <td className="py-2 text-right text-gray-700">
                            {item.qty}
                          </td>
                          <td className="py-2 text-right text-gray-700">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="py-2 text-right text-gray-500">
                            {item.taxRate}%
                          </td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            {formatCurrency(item.total)}
                          </td>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
            </div>

            <InvoicePrintPreview invoice={invoice} template={printTemplate} />
          </>
        )}
      </div>
    </FeatureGate>
  );
}

