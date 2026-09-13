import { useState } from "react";
import useSWR from "swr";
import { CustomerSelectionProps } from "../type";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";


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
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [createError, setCreateError] = useState("");
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "", address: "" });
  const customers = Array.isArray(customersResponse?.data)
    ? customersResponse.data
    : [];

  async function updateInvoiceCustomer(customerId: string) {
    if (!invoice) return false;
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
      return true;
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Unable to update customer",
      );
      return false;
    } finally {
      setCustomerSaving(false);
    }
  }

  function openCreateCustomer() {
    setCustomerForm({ name: "", email: "", phone: "", address: "" });
    setCreateError("");
    setCreateOpen(true);
  }

  async function createCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerForm.name.trim()) {
      setCreateError("Customer name is required");
      return;
    }

    setCreatingCustomer(true);
    setCreateError("");
    try {
      const createResponse = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerForm.name.trim(),
          email: customerForm.email.trim(),
          phone: customerForm.phone.trim(),
          address: customerForm.address.trim(),
        }),
      });
      const createdPayload = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok || !createdPayload?.data?._id) {
        throw new Error(createdPayload?.error ?? "Unable to create customer");
      }

      const assigned = await updateInvoiceCustomer(createdPayload.data._id);
      if (!assigned) return;
      await mutate();
      setCreateOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  }

  return (
    <div className="p-6 border-b border-gray-100 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Bill To
        </p>
        <div className="flex items-center gap-2">
          <select
            value={invoice.customerId?._id ?? ""}
            onChange={(event) => updateInvoiceCustomer(event.target.value)}
            disabled={customerSaving || creatingCustomer}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            <option value="">No customer linked</option>
            {customers.map((customer: { _id: string; name: string }) => (
              <option key={customer._id} value={customer._id}>
                {customer.name}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="secondary" onClick={openCreateCustomer} disabled={customerSaving || creatingCustomer}>
            Create customer
          </Button>
        </div>
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create customer">
        <form onSubmit={createCustomer} className="space-y-3">
          <Input
            label="Name"
            value={customerForm.name}
            onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={customerForm.email}
            onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            label="Phone"
            value={customerForm.phone}
            onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            label="Address (optional)"
            value={customerForm.address}
            onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))}
          />
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={creatingCustomer}>
              Cancel
            </Button>
            <Button type="submit" disabled={creatingCustomer}>
              {creatingCustomer ? "Creating…" : "Create and assign"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
