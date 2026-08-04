import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { ChevronDown, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import type { CartItem, CustomerData } from './types'

interface MobileCartDrawerProps {
  open: boolean
  drawerVisible: boolean
  cart: CartItem[]
  subtotal: number
  tax: number
  total: number
  cartCount: number
  selectedCustomer: CustomerData | undefined
  customers: CustomerData[]
  customerSearch: string
  customerApiError: string
  paying: boolean
  onClose: () => void
  onRemoveCustomer: () => void
  onSearchCustomer: (value: string) => void
  onSelectCustomer: (customerId: string) => void
  onCreateCustomer: () => void
  onUpdateQty: (id: string, delta: number) => void
  onRemoveFromCart: (id: string) => void
  onOpenPayment: () => void
}

export function MobileCartDrawer({
  open,
  drawerVisible,
  cart,
  subtotal,
  tax,
  total,
  cartCount,
  selectedCustomer,
  customers,
  customerSearch,
  customerApiError,
  paying,
  onClose,
  onRemoveCustomer,
  onSearchCustomer,
  onSelectCustomer,
  onCreateCustomer,
  onUpdateQty,
  onRemoveFromCart,
  onOpenPayment,
}: MobileCartDrawerProps) {
  if (!open) return null

  const filteredCustomers = customers.filter((customer) => {
    const query = customerSearch.toLowerCase().trim()
    if (!query) return true
    return (
      customer.name.toLowerCase().includes(query) ||
      (customer.email ?? '').toLowerCase().includes(query) ||
      (customer.phone ?? '').toLowerCase().includes(query)
    )
  })

  return (
    <>
      <div onClick={onClose} className={`xl:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${drawerVisible ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`xl:hidden fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out ${drawerVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-gray-500" />
            <span className="font-semibold text-gray-900">Cart ({cartCount})</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <ChevronDown size={20} />
          </button>
        </div>

        <div className="border-b border-gray-200 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</p>
            <button onClick={onCreateCustomer} className="text-xs font-medium text-indigo-600 hover:text-indigo-700" type="button">
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
                <button type="button" onClick={onRemoveCustomer} className="text-indigo-400 hover:text-indigo-700" aria-label="Remove customer">
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Input placeholder="Search customer by name, email, phone" value={customerSearch} onChange={(e) => onSearchCustomer(e.target.value)} />
              <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200">
                {filteredCustomers.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">No customers found</p>
                ) : (
                  filteredCustomers.slice(0, 8).map((customer) => (
                    <button
                      key={customer._id}
                      type="button"
                      onClick={() => onSelectCustomer(customer._id)}
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
                <button onClick={() => onRemoveFromCart(item._id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdateQty(item._id, -1)} className="rounded border border-gray-200 p-0.5 text-gray-500 hover:bg-gray-50">
                    <Minus size={12} />
                  </button>
                  <span className="text-sm w-5 text-center">{item.qty}</span>
                  <button onClick={() => onUpdateQty(item._id, 1)} className="rounded border border-gray-200 p-0.5 text-gray-500 hover:bg-gray-50">
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
          <Button className="w-full mt-2" disabled={cart.length === 0 || paying} onClick={onOpenPayment}>
            Pay now
          </Button>
        </div>
      </div>
    </>
  )
}
