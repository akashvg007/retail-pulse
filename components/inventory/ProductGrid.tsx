import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { ProductActions } from './ProductActions'
import type { ProductForm } from './types'

interface ProductGridProps {
  products: ProductForm[]
  isLoading: boolean
  onEdit: (product: ProductForm) => void
  onDelete: (id: string) => void
}

export function ProductGrid({ products, isLoading, onEdit, onDelete }: ProductGridProps) {
  if (!products.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
        {isLoading ? 'Loading…' : 'No products yet. Add your first product.'}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <div key={String(product._id)} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{product.name}</h3>
              <p className="text-xs text-gray-500">{product.sku || 'No SKU'}</p>
            </div>
            <ProductActions
              onEdit={() => onEdit(product)}
              onDelete={() => onDelete(String(product._id!))}
            />
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Category</span>
              <span className="font-medium">{product.category || 'Uncategorized'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Price</span>
              <span className="font-semibold text-gray-900">{formatCurrency(product.price)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Stock</span>
              <Badge variant={(product.stockQty ?? 0) > 0 ? 'green' : 'red'}>
                {product.stockQty ?? 0} units
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
