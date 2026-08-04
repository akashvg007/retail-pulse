export type FeatureKey =
  | 'dashboard'
  | 'invoicing'
  | 'inventory'
  | 'crm'
  | 'pos'
  | 'payments'
  | 'supplier_management'
  | 'purchase_management'
  | 'staff_management'
  | 'subscriptions'
  | 'reports'
  | 'pdf_export'
  | 'email_notifications'

export const ALL_FEATURE_KEYS: FeatureKey[] = [
  'dashboard',
  'invoicing',
  'inventory',
  'crm',
  'pos',
  'payments',
  'supplier_management',
  'purchase_management',
  'staff_management',
  'subscriptions',
  'reports',
  'pdf_export',
  'email_notifications',
]

export const FEATURE_META: Record<FeatureKey, { name: string; description: string }> = {
  dashboard: { name: 'Dashboard', description: 'Access the main dashboard overview' },
  invoicing: { name: 'Invoicing', description: 'Create, send and manage invoices' },
  inventory: { name: 'Inventory', description: 'Track products, SKUs and stock levels' },
  crm: { name: 'CRM', description: 'Manage customers and contact information' },
  pos: { name: 'Point of Sale', description: 'In-store POS with cart and quick checkout' },
  payments: { name: 'Payments', description: 'Accept payments via Razorpay' },
  supplier_management: {
    name: 'Supplier Management',
    description: 'Manage suppliers, contacts and supplier ledgers',
  },
  purchase_management: {
    name: 'Purchase Management',
    description: 'Create purchase orders, receive stock and track supplier payables',
  },
  staff_management: { name: 'Staff Management', description: 'Manage staff accounts and permissions' },
  subscriptions: { name: 'Subscriptions', description: 'Recurring billing and subscription management' },
  reports: { name: 'Reports & Analytics', description: 'Sales, inventory and customer reports' },
  pdf_export: { name: 'PDF Export', description: 'Export invoices and reports as PDF' },
  email_notifications: { name: 'Email Notifications', description: 'Send automated emails on key events' },
}
