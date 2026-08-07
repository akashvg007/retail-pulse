'use client'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { FeatureGate } from '@/components/FeatureGate'
import { ShoppingCart, Search, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartPanel } from '@/components/pos/CartPanel'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { CustomerModal } from '@/components/pos/CustomerModal'
import { MobileCartDrawer } from '@/components/pos/MobileCartDrawer'
import type { CartItem, CustomerData, CustomerFormData, PaymentOption, ProductData } from '@/components/pos/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())


type RazorpayResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayInstance = {
  open: () => void
  on: (event: string, callback: () => void) => void
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  handler: (response: RazorpayResponse) => void | Promise<void>
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

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
  const pageRef = useRef<HTMLDivElement>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('online')
  const [cashReceived, setCashReceived] = useState('')
  const [creditDueDate, setCreditDueDate] = useState(getDefaultCreditDueDate())
  const [paymentError, setPaymentError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerOpen, setCustomerOpen] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState<CustomerFormData>({ name: '', email: '', phone: '' })
  const [customerFormError, setCustomerFormError] = useState('')
  const [scannerMessage, setScannerMessage] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const scannerBufferRef = useRef('')
  const scannerClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scannerMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScannerKeystrokeRef = useRef(0)
  const searchTerm = searchQuery.trim()
  const productsUrl = searchTerm
    ? `/api/products?limit=500&search=${encodeURIComponent(searchTerm)}`
    : '/api/products?limit=100'
  const { data, isLoading, mutate: mutateProducts } = useSWR(productsUrl, fetcher)
  const { data: customersResponse, mutate: mutateCustomers } = useSWR('/api/customers?limit=100', fetcher)
  const allProductsRaw = useMemo<ProductData[]>(() => (Array.isArray(data?.data) ? data.data : []), [data])
  const allProducts = allProductsRaw.filter((p: ProductData) => p.stockQty > 0)
  const customers: CustomerData[] = Array.isArray(customersResponse?.data) ? customersResponse.data : []
  const customerApiError = typeof customersResponse?.error === 'string' ? customersResponse.error : ''
  const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId)

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

  useEffect(() => {
    return () => {
      if (scannerClearTimerRef.current) clearTimeout(scannerClearTimerRef.current)
      if (scannerMessageTimerRef.current) clearTimeout(scannerMessageTimerRef.current)
    }
  }, [])

  const showScannerMessage = useCallback((message: string) => {
    setScannerMessage(message)
    if (scannerMessageTimerRef.current) {
      clearTimeout(scannerMessageTimerRef.current)
    }
    scannerMessageTimerRef.current = setTimeout(() => {
      setScannerMessage('')
    }, 1800)
  }, [])

  const addToCart = useCallback((product: ProductData) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id)
      if (existing) return prev.map((i) => i._id === product._id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { _id: product._id, name: product.name, price: product.price, taxRate: product.taxRate, qty: 1 }]
    })
    setLastAddedId(product._id)
    setTimeout(() => setLastAddedId((prev) => (prev === product._id ? null : prev)), 400)
  }, [])

  const handleBarcodeScan = useCallback(async (rawSku: string) => {
    const scannedSku = rawSku.trim()
    if (!scannedSku) return

    const normalized = scannedSku.toLowerCase()
    const localExact = allProductsRaw.find((product) => product.sku.toLowerCase() === normalized)

    if (localExact) {
      if (localExact.stockQty <= 0) {
        showScannerMessage(`SKU ${localExact.sku} is out of stock`)
        return
      }
      addToCart(localExact)
      setSearchQuery('')
      showScannerMessage(`Added ${localExact.name}`)
      return
    }

    try {
      const response = await fetch(`/api/products?sku=${encodeURIComponent(scannedSku)}&limit=1`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        showScannerMessage(`Could not fetch SKU ${scannedSku}`)
        return
      }

      const payload = (await response.json()) as { data?: ProductData[] }
      const product = Array.isArray(payload.data) ? payload.data[0] : undefined

      if (!product) {
        showScannerMessage(`SKU ${scannedSku} not found`)
        return
      }

      if (product.stockQty <= 0) {
        showScannerMessage(`SKU ${product.sku} is out of stock`)
        return
      }

      addToCart(product)
      setSearchQuery('')
      showScannerMessage(`Added ${product.name}`)
      void mutateProducts()
    } catch {
      showScannerMessage(`Could not fetch SKU ${scannedSku}`)
    }
  }, [allProductsRaw, addToCart, mutateProducts, showScannerMessage])

  useEffect(() => {
    const page = pageRef.current
    if (!page) return

    function clearScannerBuffer() {
      scannerBufferRef.current = ''
      if (scannerClearTimerRef.current) {
        clearTimeout(scannerClearTimerRef.current)
      }
      scannerClearTimerRef.current = null
    }

    function onKeyDown(event: KeyboardEvent) {
      if (customerOpen || paymentOpen) return
      if (event.ctrlKey || event.altKey || event.metaKey) return

      const now = Date.now()
      const elapsed = now - lastScannerKeystrokeRef.current
      lastScannerKeystrokeRef.current = now

      if (event.key === 'Enter' || event.key === 'Tab') {
        const scanned = scannerBufferRef.current.trim()
        clearScannerBuffer()

        if (scanned.length >= 6) {
          event.preventDefault()
          void handleBarcodeScan(scanned)
        }
        return
      }

      if (event.key.length !== 1) return

      const target = event.target as HTMLElement | null
      const isEditable = Boolean(
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )

      // Only capture global scanner keys outside active text entry fields.
      if (isEditable && target !== searchInputRef.current) return

      if (elapsed > 120) {
        scannerBufferRef.current = event.key
      } else {
        scannerBufferRef.current += event.key
      }

      if (scannerClearTimerRef.current) {
        clearTimeout(scannerClearTimerRef.current)
      }
      scannerClearTimerRef.current = setTimeout(() => {
        scannerBufferRef.current = ''
      }, 140)
    }

    page.addEventListener('keydown', onKeyDown)
    return () => {
      page.removeEventListener('keydown', onKeyDown)
    }
  }, [customerOpen, paymentOpen, handleBarcodeScan])

  // Handle typed search in POS catalog.
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value
    setSearchQuery(query)
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
    setPaymentOption('online')
    setCashReceived('')
    setCreditDueDate(getDefaultCreditDueDate())
    setPaymentError('')
  }

  function clearSaleState() {
    setCart([])
    setSelectedCustomerId('')
    setCustomerSearch('')
    void mutateProducts()
  }

  function openPaymentModal() {
    if (cart.length === 0 || paying) return
    setPaymentOption('online')
    setCashReceived(total.toFixed(2))
    setCreditDueDate(getDefaultCreditDueDate())
    setPaymentError('')
    setPaymentOpen(true)
  }

  async function createInvoice() {
    const items = cart.map((i) => ({
      productId: i._id,
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

  async function processOnlinePayment() {
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

    const Razorpay = window.Razorpay
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
        handler: async (response: RazorpayResponse) => {
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

    alert('Online payment successful!')
  }

  async function processUPIPayment() {
    const invoice = await createInvoice()
    const res = await fetch('/api/payments/upi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice._id }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload?.error ?? 'Unable to record UPI payment')
    }

    clearSaleState()
    alert('UPI payment recorded successfully.')
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
      } else if (paymentOption === 'upi') {
        await processUPIPayment()
      } else {
        await processOnlinePayment()
      }
      resetPaymentState()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process payment'
      setPaymentError(message)
      if (paymentOption === 'upi' || paymentOption === 'online') {
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

  function handleCustomerFieldChange(field: keyof CustomerFormData, value: string) {
    setCustomerForm((prev) => ({ ...prev, [field]: value }))
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
      <div ref={pageRef} className="flex h-full flex-col xl:flex-row">
        <div className="flex flex-1 flex-col">
          <div className="relative p-4 pb-0 sm:p-6">
            <Search className="absolute left-8 top-9 sm:top-2/4 -translate-y-1/2 text-gray-400" size={18} />
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
                className="absolute right-8 top-9 sm:top-2/4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
            {scannerMessage ? <p className="mt-2 text-xs text-indigo-600">{scannerMessage}</p> : null}
          </div>
          <ProductGrid
            products={products}
            isLoading={isLoading}
            lastAddedId={lastAddedId}
            searchTerm={searchTerm}
            onAddToCart={addToCart}
          />
        </div>

        <CartPanel
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          selectedCustomer={selectedCustomer}
          customers={customers}
          customerSearch={customerSearch}
          customerApiError={customerApiError}
          cartCount={cartCount}
          paying={paying}
          onRemoveCustomer={() => {
            setSelectedCustomerId('')
            setCustomerSearch('')
          }}
          onSearchCustomer={setCustomerSearch}
          onSelectCustomer={setSelectedCustomerId}
          onCreateCustomer={openCreateCustomer}
          onUpdateQty={updateQty}
          onRemoveFromCart={removeFromCart}
          onOpenPayment={openPaymentModal}
        />
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

      <MobileCartDrawer
        open={cartDrawerOpen}
        drawerVisible={drawerVisible}
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        total={total}
        cartCount={cartCount}
        selectedCustomer={selectedCustomer}
        customers={customers}
        customerSearch={customerSearch}
        customerApiError={customerApiError}
        paying={paying}
        onClose={closeDrawer}
        onRemoveCustomer={() => {
          setSelectedCustomerId('')
          setCustomerSearch('')
        }}
        onSearchCustomer={setCustomerSearch}
        onSelectCustomer={setSelectedCustomerId}
        onCreateCustomer={openCreateCustomer}
        onUpdateQty={updateQty}
        onRemoveFromCart={removeFromCart}
        onOpenPayment={() => {
          closeDrawer()
          openPaymentModal()
        }}
      />

      <PaymentModal
        open={paymentOpen}
        payableAmount={total}
        paymentOption={paymentOption}
        cashReceived={cashReceived}
        creditDueDate={creditDueDate}
        paymentError={paymentError}
        paying={paying}
        cartCount={cart.length}
        cashBalance={cashBalance}
        onClose={() => {
          if (paying) return
          resetPaymentState()
        }}
        onSelectPaymentOption={(option) => {
          setPaymentOption(option)
          setPaymentError('')
        }}
        onCashReceivedChange={(value) => {
          setCashReceived(value)
          setPaymentError('')
        }}
        onCreditDueDateChange={(value) => {
          setCreditDueDate(value)
        }}
        onConfirmPayment={confirmPayment}
      />

      <CustomerModal
        open={customerOpen}
        form={customerForm}
        error={customerFormError}
        creating={creatingCustomer}
        onClose={() => setCustomerOpen(false)}
        onChange={handleCustomerFieldChange}
        onSubmit={createCustomer}
      />
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
