'use client'
import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { FeatureGate } from '@/components/FeatureGate'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Search, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ProductData {
  _id: string
  name: string
  sku: string
  category: string
  price: number
  taxRate: number
  stockQty: number
}

interface CartItem {
  _id: string
  name: string
  price: number
  taxRate: number
  qty: number
}

interface CustomerData {
  _id: string
  name: string
  email?: string
  phone?: string
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [paying, setPaying] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerOpen, setCustomerOpen] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' })
  const [customerFormError, setCustomerFormError] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { data } = useSWR('/api/products?limit=100', fetcher)
  const { data: customersResponse, mutate: mutateCustomers } = useSWR('/api/customers?limit=100', fetcher)
  const allProducts = (data?.data ?? []).filter((p: ProductData) => p.stockQty > 0)
  const customers: CustomerData[] = Array.isArray(customersResponse?.data) ? customersResponse.data : []
  const customerApiError = typeof customersResponse?.error === 'string' ? customersResponse.error : ''
  const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId)

  const filteredCustomers = customers.filter((customer) => {
    const query = customerSearch.toLowerCase().trim()
    if (!query) return true
    return (
      customer.name.toLowerCase().includes(query) ||
      (customer.email ?? '').toLowerCase().includes(query) ||
      (customer.phone ?? '').toLowerCase().includes(query)
    )
  })

  // Filter products by search query (name, SKU, or category)
  const products = allProducts.filter((p: ProductData) => {
    const query = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.category && p.category.toLowerCase().includes(query))
    )
  })

  // Focus search input on mount for barcode scanner
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  function addToCart(product: ProductData) {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id)
      if (existing) return prev.map((i) => i._id === product._id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { _id: product._id, name: product.name, price: product.price, taxRate: product.taxRate, qty: 1 }]
    })
  }

  // Handle barcode scan: auto-add if exactly one match, otherwise show in search
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value
    setSearchQuery(query)

    if (query.length > 0) {
      const matches = allProducts.filter((p: ProductData) => {
        const q = query.toLowerCase()
        return p.sku.toLowerCase() === q || p.name.toLowerCase().includes(q)
      })
      // Auto-add if searching by SKU (exact match)
      if (matches.length === 1 && allProducts.find((p: ProductData) => p.sku.toLowerCase() === query.toLowerCase())) {
        addToCart(matches[0])
        setSearchQuery('')
      }
    }
  }

  function clearSearch() {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    )
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i._id !== id))
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const tax = cart.reduce((sum, i) => sum + (i.price * i.qty * i.taxRate) / 100, 0)
  const total = subtotal + tax

  async function checkout() {
    if (cart.length === 0) return
    setPaying(true)
    try {
      // Create invoice
      const items = cart.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        taxRate: i.taxRate,
        total: i.price * i.qty,
      }))
      const invoiceRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, discount: 0, customerId: selectedCustomerId || undefined }),
      })

      if (!invoiceRes.ok) {
        const invoiceError = await invoiceRes.json().catch(() => ({}))
        throw new Error(invoiceError?.error ?? 'Unable to create invoice')
      }

      const { data: invoice } = await invoiceRes.json()

      // Create Razorpay order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice._id }),
      })

      if (!orderRes.ok) {
        const orderError = await orderRes.json().catch(() => ({}))
        throw new Error(orderError?.error ?? 'Unable to create payment order')
      }

      const { data: order } = await orderRes.json()

      // Open Razorpay checkout
      const Razorpay = (window as any).Razorpay
      if (!Razorpay) {
        alert('Razorpay SDK not loaded. Add it to your HTML <head>.')
        return
      }

      new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'RetailPulse',
        description: `Invoice ${invoice.invoiceNo}`,
        handler: async (response: any) => {
          await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, invoiceId: invoice._id }),
          })
          setCart([])
          setSelectedCustomerId('')
          setCustomerSearch('')
          alert('Payment successful!')
        },
      }).open()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to process payment')
    } finally {
      setPaying(false)
    }
  }

  function openCreateCustomer() {
    setCustomerForm({ name: '', email: '', phone: '' })
    setCustomerFormError('')
    setCustomerOpen(true)
  }

  async function createCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!customerForm.name.trim()) {
      setCustomerFormError('Customer name is required')
      return
    }

    setCreatingCustomer(true)
    setCustomerFormError('')

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerForm.name.trim(),
          email: customerForm.email.trim(),
          phone: customerForm.phone.trim(),
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = typeof payload?.error === 'string' ? payload.error : 'Unable to create customer'
        throw new Error(message)
      }

      const createdCustomer = payload?.data as CustomerData
      await mutateCustomers()
      if (createdCustomer?._id) {
        setSelectedCustomerId(createdCustomer._id)
      }
      setCustomerSearch('')
      setCustomerOpen(false)
    } catch (error) {
      setCustomerFormError(error instanceof Error ? error.message : 'Unable to create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

  return (
    <FeatureGate feature="pos" fallback={<LockedPage />}>
      <div className="flex h-full">
        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
              <p className="text-xs text-gray-400">{products.length} products</p>
            </div>

            {/* Search & Barcode input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products or scan barcode…"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.length > 0 ? (
              products.map((product: ProductData) => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-indigo-400 hover:shadow-sm transition-all"
                >
                  <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                  <p className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</p>
                  <p className="text-base font-bold text-indigo-600 mt-2">{formatCurrency(product.price)}</p>
                  <Badge variant={product.stockQty > 5 ? 'green' : 'yellow'} className="mt-1">
                    {product.stockQty} left
                  </Badge>
                </button>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
                <Search size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart sidebar */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
            <ShoppingCart size={18} className="text-gray-500" />
            <span className="font-semibold text-gray-900">Cart ({cart.length})</span>
          </div>

          <div className="border-b border-gray-200 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</p>
              <button
                onClick={openCreateCustomer}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                type="button"
              >
                + New
              </button>
            </div>

            {selectedCustomer ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-indigo-900">{selectedCustomer.name}</p>
                    {selectedCustomer.phone && <p className="text-xs text-indigo-700">{selectedCustomer.phone}</p>}
                    {selectedCustomer.email && <p className="text-xs text-indigo-700">{selectedCustomer.email}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('')
                      setCustomerSearch('')
                    }}
                    className="text-indigo-400 hover:text-indigo-700"
                    aria-label="Remove customer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search customer by name, email, phone"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-500">No customers found</p>
                  ) : (
                    filteredCustomers.slice(0, 8).map((customer) => (
                      <button
                        key={customer._id}
                        type="button"
                        onClick={() => setSelectedCustomerId(customer._id)}
                        className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-gray-50 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-gray-500">{customer.phone || customer.email || 'No contact details'}</p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {customerApiError && <p className="text-xs text-amber-700">{customerApiError}</p>}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {cart.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">Cart is empty</p>
            )}
            {cart.map((item) => (
              <div key={item._id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-900 flex-1 pr-2">{item.name}</p>
                  <button onClick={() => removeFromCart(item._id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item._id, -1)} className="rounded border border-gray-200 p-0.5 text-gray-500 hover:bg-gray-50">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-5 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item._id, 1)} className="rounded border border-gray-200 p-0.5 text-gray-500 hover:bg-gray-50">
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{formatCurrency(item.price * item.qty)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax</span><span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
            <Button className="w-full mt-2" disabled={cart.length === 0 || paying} onClick={checkout}>
              <CreditCard size={15} /> {paying ? 'Processing…' : 'Pay now'}
            </Button>
          </div>
        </div>
      </div>

      <Modal open={customerOpen} onClose={() => setCustomerOpen(false)} title="Create customer">
        <form onSubmit={createCustomer} className="space-y-3">
          <Input
            label="Name"
            value={customerForm.name}
            onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={customerForm.email}
            onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="Phone"
            value={customerForm.phone}
            onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          {customerFormError && <p className="text-xs text-red-600">{customerFormError}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={creatingCustomer}>
              {creatingCustomer ? 'Creating…' : 'Create customer'}
            </Button>
            <Button type="button" variant="secondary" className="text-black" onClick={() => setCustomerOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </FeatureGate>
  )
}

function LockedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">POS is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">Contact your administrator to enable this feature.</p>
    </div>
  )
}
