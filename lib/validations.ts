import { z } from 'zod'

export const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const productSchema = z.object({
  _id: z.string().optional(),
  tenantId: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
  price: z.number({ error: 'Price must be a number' }).min(0),
  cost: z.number().min(0).optional().default(0),
  category: z.string().optional().default('General'),
  stockQty: z.number().int().min(0).optional().default(0),
  taxRate: z.number().min(0).max(100).optional().default(18),
})

export const customerSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
})

export const supplierSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, 'Supplier name is required'),
  code: z.string().min(1, 'Supplier code is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional().default(true),
})

export const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().int().min(1),
  price: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  total: z.number().min(0),
})

export const invoiceSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item required'),
  discount: z.number().min(0).default(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

export const purchaseOrderItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  unitCost: z.number().min(0, 'Unit cost must be zero or more'),
  taxRate: z.number().min(0).max(100).default(0),
  total: z.number().min(0, 'Line total must be zero or more'),
})

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one purchase item is required'),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  ocrMeta: z.object({
    source: z.string().min(1),
    confidence: z.number().min(0).max(1),
    extractedAt: z.string().datetime(),
    warnings: z.array(z.string()).default([]),
  }).optional(),
})

export const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  department: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
})
