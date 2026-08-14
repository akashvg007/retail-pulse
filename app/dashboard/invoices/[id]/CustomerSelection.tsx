import { useState } from "react";
import useSWR from "swr";
import { CustomerSelectionProps } from "../type";


const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CustomerSelection({
  invoice,
  id,
  mutate,
}: CustomerSelectionProps) {
  const { data: customersResponse } = useSWR(
    "/api/customers?limit=100",
    fetcher,
  );
  const [customerSaving, setCustomerSaving] = useState(false);
  const customers = Array.isArray(customersResponse?.data)
    ? customersResponse.data
    : [];

  async function updateInvoiceCustomer(customerId: string) {
    if (!invoice) return;
    setCustomerSaving(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customerId || undefined }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "Unable to update customer");
      }

      mutate();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Unable to update customer",
      );
    } finally {
      setCustomerSaving(false);
    }
  }

  return (
    <div className="p-6 border-b border-gray-100 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Bill To
        </p>
        <select
          value={invoice.customerId?._id ?? ""}
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
        {invoice.customerId?.name ?? invoice.customerSnapshot?.name ?? "—"}
      </p>
      {(invoice.customerId?.email ?? invoice.customerSnapshot?.email) && (
        <p className="text-sm text-gray-500">
          {invoice.customerId?.email ?? invoice.customerSnapshot?.email}
        </p>
      )}
      {(invoice.customerId?.gstNumber ??
        invoice.customerSnapshot?.gstNumber) && (
        <p className="text-sm text-gray-500">
          GST:{" "}
          {invoice.customerId?.gstNumber ?? invoice.customerSnapshot?.gstNumber}
        </p>
      )}
    </div>
  );
}
