'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface CartItem {
  _id: string
  name: string
  price: number
  taxRate: number
  qty: number
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [paying, setPaying] = useState(false)
  const { data } = useSWR('/api/products?limit=100', fetcher)
  const products = (data?.data ?? []).filter((p: any) => p.stockQty > 0)

  function addToCart(product: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id)
      if (existing) return prev.map((i) => i._id === product._id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { _id: product._id, name: product.name, price: product.price, taxRate: product.taxRate, qty: 1 }]
    })
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
        body: JSON.stringify({ items, discount: 0 }),
      })
      const { data: invoice } = await invoiceRes.json()

      // Create Razorpay order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice._id }),
      })
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
          alert('Payment successful!')
        },
      }).open()
    } finally {
      setPaying(false)
    }
  }

  return (
    <FeatureGate feature="pos" fallback={<LockedPage />}>
      <div className="flex h-full">
        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Point of Sale</h1>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((product: any) => (
              <button
                key={product._id}
                onClick={() => addToCart(product)}
                className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-indigo-400 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                <p className="text-base font-bold text-indigo-600 mt-2">{formatCurrency(product.price)}</p>
                <Badge variant={product.stockQty > 5 ? 'green' : 'yellow'} className="mt-1">
                  {product.stockQty} left
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Cart sidebar */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
            <ShoppingCart size={18} className="text-gray-500" />
            <span className="font-semibold text-gray-900">Cart ({cart.length})</span>
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
