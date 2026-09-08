import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ProductData } from './types'

interface ProductGridProps {
  products: ProductData[]
  isLoading: boolean
  lastAddedId: string | null
  searchTerm: string
  onAddToCart: (product: ProductData) => void
}

export function ProductGrid({ products, isLoading, lastAddedId, searchTerm, onAddToCart }: ProductGridProps) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-24 sm:p-6 xl:pb-6">
      <div className="mb-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-xs text-gray-400">
            {searchTerm ? `${products.length} matching products` : `${products.length} products`}
            {isLoading ? '…' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-3 h-3 w-1/2" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <Skeleton className="mt-4 h-5 w-1/3" />
              <Skeleton className="mt-2 h-5 w-16 rounded-full" />
            </div>
          ))
        ) : products.length > 0 ? (
          products.map((product) => (
            <button
              key={product._id}
              onClick={() => onAddToCart(product)}
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
  )
}
