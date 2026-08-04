'use client'
import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { FeatureGate } from '@/components/FeatureGate'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Search, X, ChevronDown } from 'lucide-react'
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

type PaymentOption = 'upi' | 'cash' | 'credit'

function getDefaultCreditDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().split('T')[0]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('upi')
  const [cashReceived, setCashReceived] = useState('')
  const [creditDueDate, setCreditDueDate] = useState(getDefaultCreditDueDate())
  const [paymentError, setPaymentError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerOpen, setCustomerOpen] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' })
  const [customerFormError, setCustomerFormError] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTerm = searchQuery.trim()
  const productsUrl = searchTerm
    ? `/api/products?limit=500&search=${encodeURIComponent(searchTerm)}`
    : '/api/products?limit=100'
  const { data, isLoading } = useSWR(productsUrl, fetcher)
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
    setLastAddedId(product._id)
    setTimeout(() => setLastAddedId((prev) => (prev === product._id ? null : prev)), 400)
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

  function openDrawer() {
    setCartDrawerOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setDrawerVisible(true)))
  }

  function closeDrawer() {
    setDrawerVisible(false)
    setTimeout(() => setCartDrawerOpen(false), 320)
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
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  const cashAmount = Number(cashReceived || 0)
  const cashBalance = cashAmount - total

  function resetPaymentState() {
    setPaymentOpen(false)
    setPaymentOption('upi')
    setCashReceived('')
    setCreditDueDate(getDefaultCreditDueDate())
    setPaymentError('')
  }

  function clearSaleState() {
    setCart([])
    setSelectedCustomerId('')
    setCustomerSearch('')
  }

  function openPaymentModal() {
    if (cart.length === 0 || paying) return
    setPaymentOption('upi')
    setCashReceived(total.toFixed(2))
    setCreditDueDate(getDefaultCreditDueDate())
    setPaymentError('')
    setPaymentOpen(true)
  }

  async function createInvoice() {
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
    return invoice
  }

  async function processUPIPayment() {
    const invoice = await createInvoice()

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

    const Razorpay = (window as any).Razorpay
    if (!Razorpay) {
      throw new Error('Razorpay SDK not loaded. Add it to your HTML <head>.')
    }

    await new Promise<void>((resolve, reject) => {
      const payment = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'RetailPulse',
        description: `Invoice ${invoice.invoiceNo}`,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, invoiceId: invoice._id }),
            })
            if (!verifyRes.ok) {
              const verifyError = await verifyRes.json().catch(() => ({}))
              throw new Error(verifyError?.error ?? 'Unable to verify payment')
            }
            clearSaleState()
            resolve()
          } catch (error) {
            reject(error)
          }
        },
      })

      payment.on('payment.failed', () => {
        reject(new Error('Payment failed. Please try again.'))
      })
      payment.open()
    })

    alert('Payment successful!')
  }

  async function processCashPayment() {
    if (!Number.isFinite(cashAmount) || cashAmount <= 0) {
      throw new Error('Enter a valid cash amount')
    }
    if (cashAmount < total) {
      throw new Error('Cash amount is less than total')
    }

    const invoice = await createInvoice()
    const res = await fetch('/api/payments/cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice._id, amountReceived: cashAmount }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload?.error ?? 'Unable to capture cash payment')
    }

    clearSaleState()
    alert(`Payment successful! Balance: ${formatCurrency(cashBalance)}`)
  }

  async function processCreditSale() {
    const invoice = await createInvoice()
    const res = await fetch(`/api/invoices/${invoice._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent', dueDate: creditDueDate }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload?.error ?? 'Unable to create credit sale')
    }

    clearSaleState()
    alert(`Credit sale created successfully. Due date: ${formatDate(creditDueDate)}`)
  }

  async function confirmPayment() {
    if (cart.length === 0) return
    setPaying(true)
    setPaymentError('')
    try {
      if (paymentOption === 'cash') {
        await processCashPayment()
      } else if (paymentOption === 'credit') {
        await processCreditSale()
      } else {
        await processUPIPayment()
      }
      resetPaymentState()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process payment'
      setPaymentError(message)
      if (paymentOption === 'upi') {
        alert(message)
      }
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
      <div className="flex h-full flex-col xl:flex-row">
        {/* Product grid */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-24 sm:p-6 xl:pb-6">
          <div className="mb-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
              <p className="text-xs text-gray-400">
                {searchTerm ? `${products.length} matching products` : `${products.length} products`}
                {isLoading ? '…' : ''}
              </p>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {products.length > 0 ? (
              products.map((product: ProductData) => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                    lastAddedId === product._id
                      ? 'border-indigo-500 bg-indigo-50 scale-95 shadow-inner'
                      : 'border-gray-200 bg-white hover:border-indigo-400 hover:shadow-sm'
                  }`}
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

        {/* Cart sidebar — desktop only */}
        <div className="hidden xl:flex w-full flex-col border-t border-gray-200 bg-white xl:w-80 xl:border-l xl:border-t-0">
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
            <Button className="w-full mt-2" disabled={cart.length === 0 || paying} onClick={openPaymentModal}>
              <CreditCard size={15} /> {paying ? 'Processing…' : 'Pay now'}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom banner */}
      {cart.length > 0 && (
        <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-3">
          <button
            onClick={openDrawer}
            className="flex w-full items-center gap-3 rounded-2xl bg-indigo-600 px-4 py-3 text-white shadow-lg active:scale-[0.98] transition-transform"
          >
            <div className="relative shrink-0">
              <ShoppingCart size={22} />
              <span className="absolute -top-2 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-700 text-[11px] font-bold leading-none">
                {cartCount}
              </span>
            </div>
            <span className="flex-1 text-center text-base font-semibold">{formatCurrency(total)}</span>
            <span className="shrink-0 text-sm font-medium opacity-90">
              {cartCount} item{cartCount !== 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      {/* Mobile cart bottom drawer */}
      {cartDrawerOpen && (
        <>
          <div
            onClick={closeDrawer}
            className={`xl:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
          />
          <div className={`xl:hidden fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out ${drawerVisible ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-gray-500" />
                <span className="font-semibold text-gray-900">Cart ({cartCount})</span>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <ChevronDown size={20} />
              </button>
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
                      onClick={() => { setSelectedCustomerId(''); setCustomerSearch('') }}
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
              <Button
                className="w-full mt-2"
                disabled={cart.length === 0 || paying}
                onClick={() => { closeDrawer(); openPaymentModal() }}
              >
                <CreditCard size={15} /> {paying ? 'Processing…' : 'Pay now'}
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={paymentOpen}
        onClose={() => {
          if (paying) return
          resetPaymentState()
        }}
        title="Select payment option"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">Payable amount</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(total)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentOption('upi')
                setPaymentError('')
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                paymentOption === 'upi'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              UPI
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentOption('cash')
                setPaymentError('')
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                paymentOption === 'cash'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentOption('credit')
                setPaymentError('')
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                paymentOption === 'credit'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Credit
            </button>
          </div>

          {paymentOption === 'cash' && (
            <div className="space-y-2 rounded-lg border border-gray-200 px-3 py-3">
              <Input
                label="Amount received"
                type="number"
                min={0}
                step="0.01"
                value={cashReceived}
                onChange={(e) => {
                  setCashReceived(e.target.value)
                  setPaymentError('')
                }}
                placeholder="Enter amount given by customer"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Balance</span>
                <span className={cashBalance < 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                  {formatCurrency(cashBalance)}
                </span>
              </div>
              {cashBalance < 0 && (
                <p className="text-xs text-red-600">Received amount is less than total payable amount.</p>
              )}
            </div>
          )}

          {paymentOption === 'credit' && (
            <div className="space-y-2 rounded-lg border border-gray-200 px-3 py-3">
              <Input
                label="Due date"
                type="date"
                value={creditDueDate}
                onChange={(e) => setCreditDueDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">This will create an invoice for the customer and mark it as a credit sale.</p>
            </div>
          )}

          {paymentError && <p className="text-xs text-red-600">{paymentError}</p>}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="text-black"
              onClick={resetPaymentState}
              disabled={paying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={confirmPayment}
              disabled={
                paying ||
                cart.length === 0 ||
                (paymentOption === 'cash' && (!Number.isFinite(cashAmount) || cashAmount < total))
              }
            >
              {paying ? 'Processing…' : 'Confirm payment'}
            </Button>
          </div>
        </div>
      </Modal>

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
