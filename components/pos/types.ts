export interface ProductData {
  _id: string
  name: string
  sku: string
  category: string
  price: number
  taxRate: number
  stockQty: number
}

export interface CartItem {
  _id: string
  name: string
  price: number
  taxRate: number
  qty: number
}

export interface CustomerData {
  _id: string
  name: string
  email?: string
  phone?: string
}

export interface CustomerFormData {
  name: string
  email: string
  phone: string
}

export type PaymentOption = 'online' | 'upi' | 'cash' | 'credit'
