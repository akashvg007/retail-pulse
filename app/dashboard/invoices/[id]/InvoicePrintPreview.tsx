import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceData, InvoicePrintTemplate } from "../type";
import Image from "next/image";

type InvoiceBranding = {
  name?: string;
  businessLogo?: string;
};

export default function InvoicePrintPreview({
  invoice,
  template,
}: {
  invoice: InvoiceData & { tenantBranding?: InvoiceBranding };
  template: InvoicePrintTemplate;
}) {
  const businessName = invoice.tenantBranding?.name || invoice.businessName?.trim() || "Your Shop";
  const logo = invoice.tenantBranding?.businessLogo;
  const customerName =
    invoice.customerId?.name ?? invoice.customerSnapshot?.name;
  const customerEmail =
    invoice.customerId?.email ?? invoice.customerSnapshot?.email;
  const customerGst =
    invoice.customerId?.gstNumber ?? invoice.customerSnapshot?.gstNumber;

  if (template === "standard-a4" || template === "standard-a5") {
    return (
      <div className={`hidden print:block print:mx-auto print:bg-white print:rounded-none print:shadow-none print:border-0 ${template === "standard-a5" ? "invoice-print-a5" : "print:max-w-3xl"}`}>
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              {logo && (
                <Image
                  src={logo}
                  alt="Business Logo"
                  width={150}
                  height={64}
                  className="max-h-16 w-auto object-contain"
                />
              )}
              <div>
                <p className="text-lg font-semibold text-gray-900">
              {businessName}
            </p>
                <p className="text-2xl font-bold text-gray-900">Invoice</p>
                <p className="text-sm text-gray-500 mt-1">{invoice.invoiceNo}</p>
              </div>
          </div>
            <div className="text-right text-sm text-gray-600">
              <p>Issued {formatDate(invoice.createdAt)}</p>
              {invoice.dueDate && <p>Due {formatDate(invoice.dueDate)}</p>}
              {invoice.staffName && <p>Issued by {invoice.staffName}</p>}
            </div>
        </div>
        </div>
        <div className="py-4 text-sm text-gray-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Bill To
          </p>
          <p className="mt-1 font-semibold text-gray-900">
            {customerName || "Walk-in customer"}
          </p>
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
                <td className="py-2 text-right">
                  {formatCurrency(item.price)}
                </td>
                <td className="py-2 text-right">{item.taxRate}%</td>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(item.total)}
                </td>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Notes
            </p>
            <p className="mt-1">{invoice.notes}</p>
          </div>
        )}
      </div>
  );
}

  if (template === "minimal-a4") {
    return (
      <div className="hidden print:block print:mx-auto print:max-w-3xl print:bg-white print:rounded-none print:shadow-none print:border-0">
        <div className="flex items-end justify-between border-b border-gray-300 pb-3">
          <div className="flex gap-3">
            {logo && (
              <Image
                src={logo}
                alt="Business Logo"
                width={100}
                height={48}
                className="max-h-12 w-auto object-contain"
              />
            )}
            <div>
              <p className="text-base font-semibold text-gray-900">
            {businessName}
          </p>
              <h2 className="text-xl font-bold tracking-tight">
                {invoice.invoiceNo}
              </h2>
              </div>
            </div>
          <p className="text-xs text-gray-600">
            {formatDate(invoice.createdAt)}
          </p>
            </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
          <div>
            <p className="font-semibold text-gray-900">Customer</p>
            <p>{customerName || "Walk-in customer"}</p>
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
                <td className="py-1.5 text-right">
                  {formatCurrency(item.total)}
                </td>
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
  );
}

  if (template === "thermal-detailed") {
    return (
      <div className="hidden print:flex print:justify-center">
        <div className="thermal-print thermal-print-detailed border border-gray-200 bg-white p-2 font-mono text-[11px] text-black leading-tight">
          {logo && (
            <div className="flex justify-center mb-1">
              <Image src={logo} alt="Logo" width={120} height={64} className="max-h-16 w-auto object-contain" />
            </div>
          )}
          <p className="text-center text-sm font-bold uppercase">
            {businessName}
          </p>
          <p className="text-center text-base font-bold">INVOICE</p>
          <p className="text-center">{invoice.invoiceNo}</p>
          <p className="mt-1 text-center">{formatDate(invoice.createdAt)}</p>
          <p className="text-center">Status: {invoice.status.toUpperCase()}</p>

          <div className="my-2 border-t border-dashed border-black" />

          <p className="font-bold">Bill To</p>
          <p>{customerName || "Walk-in customer"}</p>
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
              {item.taxRate > 0 && (
                <p className="text-[10px]">Tax: {item.taxRate}%</p>
              )}
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
    );
  }

  return (
    <div className="hidden print:flex print:justify-center">
      <div className="thermal-print thermal-print-compact border border-gray-200 bg-white px-2 py-1.5 font-mono text-[10px] text-black leading-tight">
        {logo && (
          <div className="flex justify-center mb-1">
            <Image src={logo} alt="Logo" width={80} height={40} className="max-h-10 w-auto object-contain" />
          </div>
        )}
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
  );
}

