import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getInvoiceSavings,
  getInvoiceTaxSplit,
  InvoiceData,
  InvoicePrintTemplate,
  InvoiceTemplateElement,
  InvoiceTemplateLayout,
  InvoiceTemplateSection,
} from "../type";
import Image from "next/image";

type InvoiceBranding = {
  name?: string;
  businessLogo?: string;
  address?: string;
  gstNumber?: string;
  phone?: string;
  email?: string;
  paymentTerms?: string;
  invoiceFooter?: string;
  invoiceTemplate?: {
    version: 1;
    layouts: Partial<Record<InvoicePrintTemplate, InvoiceTemplateLayout>>;
  };
  invoiceDisplay?: Record<string, boolean>;
};

export default function InvoicePrintPreview({
  invoice,
  template,
}: {
  invoice: InvoiceData & { tenantBranding?: InvoiceBranding };
  template: InvoicePrintTemplate;
}) {
  const businessName = invoice.tenantBranding?.name || invoice.businessName?.trim() || "Your Shop";
  const branding = invoice.tenantBranding;
  const display = {
    showCompanyName: true,
    showAddress: true,
    showGstNumber: true,
    showLogo: true,
    showContactDetails: true,
    showCustomerDetails: true,
    showCustomerAddress: true,
    showItemTax: true,
    showTotals: true,
    showNotes: true,
    showPaymentTerms: true,
    showFooter: true,
    showTaxSplit: true,
    ...branding?.invoiceDisplay,
  };
  const logo = display.showLogo ? branding?.businessLogo : undefined;
  const customerName =
    invoice.customerId?.name ?? invoice.customerSnapshot?.name;
  const customerEmail =
    invoice.customerId?.email ?? invoice.customerSnapshot?.email;
  const customerAddress =
    invoice.customerId?.address ?? invoice.customerSnapshot?.address;
  const customerGst =
    invoice.customerId?.gstNumber ?? invoice.customerSnapshot?.gstNumber;
  const taxSplit = getInvoiceTaxSplit(invoice);
  const customLayout = invoice.tenantBranding?.invoiceTemplate?.layouts[template];

  if (customLayout?.customized) {
    return <CustomInvoiceLayout invoice={invoice} layout={customLayout} template={template} />;
  }

  if (template === "standard-a4" || template === "standard-a5") {
    return (
      <div className={`hidden print:block print:mx-auto print:bg-white print:rounded-none print:shadow-none print:border-0 ${template === "standard-a5" ? "invoice-print-a5" : "print:max-w-3xl"}`}>
        <div className="text-center">
          {logo && (
            <Image
              src={logo}
              alt="Business Logo"
              width={150}
              height={64}
              className="mx-auto max-h-16 w-auto object-contain"
            />
          )}
          {display.showCompanyName && <p className="text-lg font-semibold text-gray-900">{businessName}</p>}
          {display.showAddress && branding?.address && <p className="text-sm text-gray-600">{branding.address}</p>}
          {display.showGstNumber && branding?.gstNumber && <p className="text-sm text-gray-600">GST: {branding.gstNumber}</p>}
          {display.showContactDetails && branding?.phone && <p className="text-sm text-gray-600">Ph: {branding.phone}</p>}
        </div>

        <div className="flex justify-between text-sm text-gray-700">
          {display.showCustomerDetails &&
          (<div className="border-b border-gray-200 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">To</p>
            <p>{customerName || "Walk-in customer"}</p>
            {customerEmail && <p>{customerEmail}</p>}
            {display.showCustomerAddress && customerAddress && <p>{customerAddress}</p>}
            {customerGst && <p >GST: {customerGst}</p>}
          </div>)
          }
          <div>
            <p className="text-right">Bill No: {invoice.invoiceNo}</p>
            <p className="text-right">Date: {formatDate(invoice.createdAt)}</p>
          </div>
        </div>


        <table className="w-full text-sm border-y border-gray-200">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 font-medium">Item</th>
              <th className="py-1 font-medium text-right">Qty</th>
              <th className="py-1 font-medium text-right">MRP</th>
              <th className="py-1 font-medium text-right">Price</th>
              {display.showItemTax && <th className="py-1 font-medium text-right">Tax</th>}
              <th className="py-1 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
        {invoice.items.map((item, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-1 text-gray-900">{item.name}</td>
                <td className="py-1 text-right">{item.qty}</td>
                <td className="py-1 text-right">{formatCurrency(item.mrp ?? 0)}</td>
                <td className="py-1 text-right">
                  {formatCurrency(item.price)}
                </td>
                {display.showItemTax && <td className="py-1 text-right">{item.taxRate}%</td>}
                <td className="py-1 text-right font-medium">
                  {formatCurrency(item.total)}
                </td>
              </tr>
        ))}
          </tbody>
        </table>

        <div className="mt-2 flex items-start justify-between gap-6 text-sm">
          <p className="max-w-[45%] text-gray-700">
            You have saved Rs: {formatCurrency(getInvoiceSavings(invoice))}
          </p>
          {display.showTotals && <div className="w-64 shrink-0">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxAmount > 0 && (display.showTaxSplit ? <>
              <div className="mt-1 flex justify-between text-gray-700">
                <span>CGST ({taxSplit.rate.toFixed(2)}%)</span>
                <span>{formatCurrency(taxSplit.amount)}</span>
              </div>
              <div className="mt-1 flex justify-between text-gray-700">
                <span>SGST ({taxSplit.rate.toFixed(2)}%)</span>
                <span>{formatCurrency(taxSplit.amount)}</span>
              </div>
            </> : <div className="mt-1 flex justify-between text-gray-700">
              <span>GST ({(taxSplit.rate * 2).toFixed(2)}%)</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>)}
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
          </div>}
        </div>

        <div className="mt-2 border-t border-gray-300 pt-2 text-sm text-gray-700">
          <p className="text-right mr-6 font-semibold text-gray-900">
            For {businessName}
          </p>
          <div className="mt-10 flex items-end justify-between gap-8">
            <div className="text-center">
              {/* <p className="mb-1 min-w-28 border-b border-gray-400" />
              <p>Checked By</p>
              <p className="mt-1 font-semibold">E.&amp;O.E.</p> */}
            </div>
            <div className="text-center">
              <div className="flex items-end justify-center gap-4">
                <div>
                  <p className="mb-1 min-w-36 border-b border-gray-400" />
                  <p className="font-semibold">Authorised signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      {display.showNotes && invoice.notes && (
          <div className="mt-5 text-sm text-gray-600">
            <p className="text-xs font-semibold uppercase tracking-normal text-gray-400">
              Notes
            </p>
            <p className="mt-1">{invoice.notes}</p>
          </div>
        )}
        {display.showFooter && (branding?.paymentTerms || branding?.invoiceFooter) && (
          <div className="mt-5 border-t border-gray-200 pt-3 text-sm text-gray-600">
            {display.showPaymentTerms && branding.paymentTerms && <p>Payment Terms: {branding.paymentTerms}</p>}
            {branding.invoiceFooter && <p className="mt-2">{branding.invoiceFooter}</p>}
          </div>
        )}
      </div>
  );
}

function CustomInvoiceLayout({
  invoice,
  layout,
  template,
}: {
  invoice: InvoiceData & { tenantBranding?: InvoiceBranding };
  layout: InvoiceTemplateLayout;
  template: InvoicePrintTemplate;
}) {
  const branding = invoice.tenantBranding;
  const display = {
    showCompanyName: true,
    showAddress: true,
    showGstNumber: true,
    showLogo: true,
    showContactDetails: true,
    showCustomerDetails: true,
    showCustomerAddress: true,
    showItemTax: true,
    showTotals: true,
    showNotes: true,
    showPaymentTerms: true,
    showFooter: true,
    showTaxSplit: true,
    ...branding?.invoiceDisplay,
  };
  const customerName = invoice.customerId?.name ?? invoice.customerSnapshot?.name;
  const customerEmail = invoice.customerId?.email ?? invoice.customerSnapshot?.email;
  const customerAddress = invoice.customerId?.address ?? invoice.customerSnapshot?.address;
  const customerGst = invoice.customerId?.gstNumber ?? invoice.customerSnapshot?.gstNumber;
  const taxSplit = getInvoiceTaxSplit(invoice);
  const savings = getInvoiceSavings(invoice);
  const pageStyle = template.startsWith("thermal")
    ? { width: "80mm", minHeight: template === "thermal-compact" ? "140mm" : "180mm" }
    : { width: template === "standard-a5" ? "148mm" : "210mm", minHeight: template === "standard-a5" ? "210mm" : "297mm" };

  function renderSection(section: InvoiceTemplateSection) {
    if (section === "branding") {
      return (
        <div className="text-center">
          {display.showLogo && branding?.businessLogo && <Image src={branding.businessLogo} alt="Business Logo" width={120} height={48} className="mx-auto max-h-12 w-auto object-contain" />}
          {display.showCompanyName && <p className="text-lg font-semibold text-gray-900">{branding?.name || invoice.businessName || "Your Shop"}</p>}
          {display.showAddress && branding?.address && <p>{branding.address}</p>}
          {display.showGstNumber && branding?.gstNumber && <p>GST: {branding.gstNumber}</p>}
          {display.showContactDetails && (branding?.phone || branding?.email) && <p>{[branding.phone, branding.email].filter(Boolean).join(" | ")}</p>}
        </div>
      );
    }
    if (section === "metadata") {
      return <div className="text-sm"><p className="font-semibold text-gray-900">{invoice.invoiceNo}</p><p>Issued {formatDate(invoice.createdAt)}</p>{invoice.dueDate && <p>Due {formatDate(invoice.dueDate)}</p>}{invoice.staffName && <p>Issued by {invoice.staffName}</p>}</div>;
    }
    if (section === "customer" && display.showCustomerDetails) {
      return <div className="text-sm"><p className="font-semibold uppercase tracking-normal text-gray-400">Bill To</p><p className="font-semibold text-gray-900">{customerName || "Walk-in customer"}</p>{customerEmail && <p>{customerEmail}</p>}{display.showCustomerAddress && customerAddress && <p>{customerAddress}</p>}{customerGst && <p>GST: {customerGst}</p>}</div>;
    }
    if (section === "items") {
      return <table className="w-full text-xs"><thead><tr className="border-y border-gray-200 text-left"><th className="py-1">Item</th><th className="py-1 text-right">Qty</th><th className="py-1 text-right">Price</th><th className="py-1 text-right">Total</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={index} className="border-b border-gray-100"><td className="py-1">{item.name}</td><td className="py-1 text-right">{item.qty}</td><td className="py-1 text-right">{formatCurrency(item.price)}</td><td className="py-1 text-right">{formatCurrency(item.total)}</td></tr>)}</tbody></table>;
    }
    if (section === "totals" && display.showTotals) {
      return <div className="ml-auto w-2/3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>{invoice.taxAmount > 0 && (display.showTaxSplit ? <><div className="flex justify-between"><span>CGST ({taxSplit.rate.toFixed(2)}%)</span><span>{formatCurrency(taxSplit.amount)}</span></div><div className="flex justify-between"><span>SGST ({taxSplit.rate.toFixed(2)}%)</span><span>{formatCurrency(taxSplit.amount)}</span></div></> : <div className="flex justify-between"><span>GST ({(taxSplit.rate * 2).toFixed(2)}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div>)}{invoice.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(invoice.discount)}</span></div>}<div className="mt-1 flex justify-between border-t border-gray-300 pt-1 font-bold text-gray-900"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div></div>;
    }
    if (section === "savings") {
      return <div className="text-sm font-semibold text-green-700">You saved {formatCurrency(savings)}</div>;
    }
    if (section === "notes" && (display.showNotes || display.showFooter)) {
      return <div className="text-sm text-gray-600">{display.showNotes && invoice.notes && <><p className="font-semibold uppercase tracking-wide text-gray-400">Notes</p><p>{invoice.notes}</p></>}{display.showPaymentTerms && branding?.paymentTerms && <p className="mt-1">Payment Terms: {branding.paymentTerms}</p>}{display.showFooter && branding?.invoiceFooter && <p className="mt-1">{branding.invoiceFooter}</p>}</div>;
    }
    return null;
  }

  return (
    <div className="hidden print:relative print:block print:overflow-hidden print:bg-white print:p-6 print:text-gray-700" style={pageStyle}>
      {layout.elements.map((element: InvoiceTemplateElement) => (
        <div key={element.id} className="absolute overflow-hidden" style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%`, zIndex: element.zIndex }}>
          {renderSection(element.section)}
        </div>
      ))}
    </div>
  );
}

  if (template === "minimal-a4") {
    return (
      <div className="hidden print:block print:mx-auto print:max-w-3xl print:bg-white print:rounded-none print:shadow-none print:border-0">
        <div className="border-b border-gray-300 pb-2 text-center">
          {logo && <Image src={logo} alt="Business Logo" width={100} height={48} className="mx-auto max-h-12 w-auto object-contain" />}
          {display.showCompanyName && <p className="text-base font-semibold text-gray-900">{businessName}</p>}
          {display.showAddress && branding?.address && <p className="text-xs text-gray-600">{branding.address}</p>}
          {display.showGstNumber && branding?.gstNumber && <p className="text-xs text-gray-600">GST: {branding.gstNumber}</p>}
          {display.showContactDetails && branding?.phone && <p className="text-xs text-gray-600">Ph: {branding.phone}</p>}
        </div>

        <div className="flex items-start justify-between border-b border-gray-300 py-2 text-xs text-gray-600">
          <div>
            <p>Bill No: {invoice.invoiceNo}</p>
            <p>Date: {formatDate(invoice.createdAt)}</p>
          </div>
          {customerGst && <p className="text-right">GST: {customerGst}</p>}
        </div>

        {display.showCustomerDetails && <div className="border-b border-gray-300 py-2 text-xs text-gray-600">
          <div>
            <p className="font-semibold text-gray-900">To</p>
            <p>{customerName || "Walk-in customer"}</p>
            {customerEmail && <p>{customerEmail}</p>}
            {display.showCustomerAddress && customerAddress && <p>{customerAddress}</p>}
          </div>
        </div>}

        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="border-y border-gray-300">
              <th className="py-1 text-left font-semibold">Item</th>
              <th className="py-1 text-right font-semibold">Qty</th>
              <th className="py-1 text-right font-semibold">MRP</th>
              <th className="py-1 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
        {invoice.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1">{item.name}</td>
                <td className="py-1 text-right">{item.qty}</td>
                <td className="py-1 text-right">{formatCurrency(item.mrp ?? 0)}</td>
                <td className="py-1 text-right">
                  {formatCurrency(item.total)}
                </td>
              </tr>
        ))}
          </tbody>
        </table>

        <div className="mt-3 flex items-start justify-between gap-4 text-xs">
          <p className="max-w-[45%] text-gray-600">You have saved Rs: {formatCurrency(getInvoiceSavings(invoice))}</p>
          {display.showTotals && <div className="w-48 shrink-0">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxAmount > 0 && (display.showTaxSplit ? <>
              <div className="mt-1 flex justify-between">
                <span>CGST ({taxSplit.rate.toFixed(2)}%)</span>
                <span>{formatCurrency(taxSplit.amount)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>SGST ({taxSplit.rate.toFixed(2)}%)</span>
                <span>{formatCurrency(taxSplit.amount)}</span>
              </div>
            </> : <div className="mt-1 flex justify-between">
              <span>GST ({(taxSplit.rate * 2).toFixed(2)}%)</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>)}
            {invoice.discount > 0 && <div className="mt-1 flex justify-between"><span>Discount</span><span>-{formatCurrency(invoice.discount)}</span></div>}
            <div className="mt-1.5 flex justify-between border-t border-gray-300 pt-1.5 font-bold text-gray-900"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
          </div>}
        </div>
        {display.showFooter && (branding?.paymentTerms || branding?.invoiceFooter) && (
          <div className="mt-3 border-t border-gray-300 pt-2 text-xs text-gray-600">
            {display.showPaymentTerms && branding.paymentTerms && <p>Payment Terms: {branding.paymentTerms}</p>}
            {branding.invoiceFooter && <p className="mt-1">{branding.invoiceFooter}</p>}
          </div>
        )}
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
          {display.showCompanyName && <p className="text-center text-sm font-bold uppercase">{businessName}</p>}
          {display.showAddress && branding?.address && <p className="text-center">{branding.address}</p>}
          {display.showGstNumber && branding?.gstNumber && <p className="text-center">GST: {branding.gstNumber}</p>}
          {display.showContactDetails && branding?.phone && <p className="text-center">Ph: {branding.phone}</p>}

          <div className="my-2 flex justify-between border-y border-dashed border-black py-1">
            <div>
              <p>Bill No: {invoice.invoiceNo}</p>
              <p>Date: {formatDate(invoice.createdAt)}</p>
            </div>
            {customerGst && <p className="text-right">GST: {customerGst}</p>}
          </div>

          {display.showCustomerDetails && <div className="mb-2">
            <p className="font-bold">To</p>
            <p>{customerName || "Walk-in customer"}</p>
            {customerEmail && <p>{customerEmail}</p>}
            {display.showCustomerAddress && customerAddress && <p>{customerAddress}</p>}
          </div>}

          <div className="my-2 border-t border-dashed border-black" />

          {invoice.items.map((item, i) => (
            <div key={i} className="py-1">
              <p className="font-semibold">{item.name}</p>
              <div className="flex justify-between">
                <span>
                  {item.qty} x {formatCurrency(item.price)} | MRP {formatCurrency(item.mrp ?? 0)}
                </span>
                <span>{formatCurrency(item.total)}</span>
              </div>
              {display.showItemTax && item.taxRate > 0 && (
                <p className="text-[10px]">Tax: {item.taxRate}%</p>
              )}
            </div>
          ))}

          <div className="my-2 border-t border-dashed border-black" />

          <div className="flex items-start justify-between gap-2">
            <p className="max-w-[45%]">Saved Rs: {formatCurrency(getInvoiceSavings(invoice))}</p>
            {display.showTotals && <div className="min-w-[52%] space-y-0.5">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
              {invoice.taxAmount > 0 && (display.showTaxSplit ? <>
                <div className="flex justify-between"><span>CGST ({taxSplit.rate.toFixed(2)}%)</span><span>{formatCurrency(taxSplit.amount)}</span></div>
                <div className="flex justify-between"><span>SGST ({taxSplit.rate.toFixed(2)}%)</span><span>{formatCurrency(taxSplit.amount)}</span></div>
              </> : <div className="flex justify-between"><span>GST ({(taxSplit.rate * 2).toFixed(2)}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div>)}
              {invoice.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(invoice.discount)}</span></div>}
              <div className="mt-1 flex justify-between border-t border-black pt-1 font-bold text-[12px]"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
            </div>}
          </div>

          {display.showNotes && invoice.notes && (
            <>
              <div className="my-2 border-t border-dashed border-black" />
              <p className="font-bold">Notes</p>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </>
          )}
          {display.showFooter && (branding?.paymentTerms || branding?.invoiceFooter) && (
            <>
              <div className="my-2 border-t border-dashed border-black" />
              {display.showPaymentTerms && branding.paymentTerms && <p>Payment Terms: {branding.paymentTerms}</p>}
              {branding.invoiceFooter && <p className="mt-1 whitespace-pre-wrap">{branding.invoiceFooter}</p>}
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
          {display.showCompanyName && <p className="font-bold uppercase">{businessName}</p>}
          {display.showAddress && branding?.address && <p>{branding.address}</p>}
          {display.showGstNumber && branding?.gstNumber && <p>GST: {branding.gstNumber}</p>}
          {display.showContactDetails && branding?.phone && <p>Ph: {branding.phone}</p>}
        </div>

        <div className="my-1 border-t border-dashed border-black" />

        <div className="mb-1">
          <p className="font-bold">Bill No: {invoice.invoiceNo}</p>
          <p>Date: {formatDate(invoice.createdAt)}</p>
          {customerGst && <p>GST: {customerGst}</p>}
          {display.showCustomerDetails && (
            <>
            <p className="font-bold">To</p>
            <p>{customerName || "Walk-in customer"}</p>
            {customerEmail && <p>{customerEmail}</p>}
            {display.showCustomerAddress && customerAddress && <p>{customerAddress}</p>}
            </>
          )}
        </div>

        {invoice.items.map((item, i) => (
          <div key={i} className="flex justify-between py-0.5">
            <span className="max-w-[60%] truncate">{item.name}</span>
            <span>
              {item.qty} x {formatCurrency(item.price)} | MRP {formatCurrency(item.mrp ?? 0)}
            </span>
          </div>
        ))}

        <div className="my-1 border-t border-dashed border-black" />

        <div className="flex items-start justify-between gap-2">
          <p className="max-w-[42%]">Saved Rs: {formatCurrency(getInvoiceSavings(invoice))}</p>
          {display.showTotals && <div className="min-w-[55%] space-y-0.5">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
            {invoice.taxAmount > 0 && (display.showTaxSplit ? <>
              <div className="flex justify-between"><span>CGST ({taxSplit.rate.toFixed(2)}%)</span><span>{formatCurrency(taxSplit.amount)}</span></div>
              <div className="flex justify-between"><span>SGST ({taxSplit.rate.toFixed(2)}%)</span><span>{formatCurrency(taxSplit.amount)}</span></div>
            </> : <div className="flex justify-between"><span>GST ({(taxSplit.rate * 2).toFixed(2)}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div>)}
            <div className="flex justify-between font-bold text-[11px]"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
          </div>}
        </div>
      </div>
    </div>
  );
}

