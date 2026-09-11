
export type InvoicePrintTemplate =
  | "standard-a4"
  | "standard-a5"
  | "minimal-a4"
  | "thermal-detailed"
  | "thermal-compact";

export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
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
    gstNumber?: string;
  } | null;
  customerSnapshot?: {
    name?: string;
    email?: string;
    gstNumber?: string;
  } | null;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  notes?: string;
  tenantBranding?: {
    name?: string;
    businessLogo?: string;
    address?: string;
    gstNumber?: string;
    phone?: string;
    email?: string;
    paymentTerms?: string;
    invoiceFooter?: string;
    invoiceDisplay?: Partial<Record<
      | "showCompanyName"
      | "showAddress"
      | "showGstNumber"
      | "showLogo"
      | "showContactDetails"
      | "showCustomerDetails"
      | "showItemTax"
      | "showTotals"
      | "showNotes"
      | "showPaymentTerms"
      | "showFooter",
      boolean
    >>;
  };
}

export interface CustomerSelectionProps {
  invoice: InvoiceData;
  id: string;
  mutate: () => void;
}