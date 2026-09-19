
export type InvoicePrintTemplate =
  | "standard-a4"
  | "standard-a5"
  | "minimal-a4"
  | "thermal-detailed"
  | "thermal-compact";

export type InvoiceTemplateSection =
  | "branding"
  | "metadata"
  | "customer"
  | "items"
  | "totals"
  | "notes"
  | "savings";

export interface InvoiceTemplateElement {
  id: string;
  section: InvoiceTemplateSection;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface InvoiceTemplateLayout {
  version: 1;
  customized: boolean;
  elements: InvoiceTemplateElement[];
}

export type InvoiceTemplateLayouts = Partial<
  Record<InvoicePrintTemplate, InvoiceTemplateLayout>
>;

export interface InvoiceTemplateSettings {
  version: 1;
  layouts: InvoiceTemplateLayouts;
}

export interface InvoiceItem {
  productId?: string;
  name: string;
  qty: number;
  returnedQty?: number;
  price: number;
  mrp: number;
  taxRate: number;
  total: number;
}

export interface InvoiceData {
  _id?: string;
  invoiceNo: string;
  businessName?: string;
  createdAt: string;
  dueDate?: string;
  staffName?: string;
  status: "draft" | "sent" | "paid" | "overdue" | string;
  customerId?: {
    _id: string;
    name?: string;
    email?: string;
    address?: string;
    gstNumber?: string;
  } | null;
  customerSnapshot?: {
    name?: string;
    email?: string;
    address?: string;
    gstNumber?: string;
  } | null;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  notes?: string;
  inventoryDeductedAt?: string;
  refundedAt?: string;
  tenantBranding?: {
    name?: string;
    businessLogo?: string;
    address?: string;
    gstNumber?: string;
    phone?: string;
    email?: string;
    paymentTerms?: string;
    invoiceFooter?: string;
    invoiceTemplate?: InvoiceTemplateSettings;
    invoiceDisplay?: Partial<Record<
      | "showCompanyName"
      | "showAddress"
      | "showGstNumber"
      | "showLogo"
      | "showContactDetails"
      | "showCustomerDetails"
      | "showCustomerAddress"
      | "showItemTax"
      | "showTotals"
      | "showNotes"
      | "showPaymentTerms"
      | "showFooter"
      | "showTaxSplit",
      boolean
    >>;
  };
}

export function getInvoiceSavings(invoice: Pick<InvoiceData, "items">) {
  return invoice.items.reduce((total, item) => {
    const savingsPerItem = Math.max(0, (item.mrp ?? 0) - item.price);
    return total + savingsPerItem * item.qty;
  }, 0);
}

export function getInvoiceTaxSplit(invoice: Pick<InvoiceData, "subtotal" | "taxAmount">) {
  const halfTax = invoice.taxAmount / 2;
  const halfRate = invoice.subtotal > 0 ? (halfTax / invoice.subtotal) * 100 : 0;

  return { amount: halfTax, rate: halfRate };
}

export interface CustomerSelectionProps {
  invoice: InvoiceData;
  id: string;
  mutate: () => void;
}