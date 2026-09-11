import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { ProductActions } from './ProductActions'
import type { ProductForm } from './types'

interface ProductTableProps {
  products: ProductForm[]
  isLoading: boolean
  onEdit: (product: ProductForm) => void
  onDelete: (id: string) => void
}

export function ProductTable({ products, isLoading, onEdit, onDelete }: ProductTableProps) {
  return (
    <Table
      columns={[
        { key: 'name', from: 'inventory', label: 'Name' },
        { key: 'sku', from: 'inventory', label: 'SKU' },
        { key: 'category', from: 'inventory', label: 'Category' },
        { key: 'price', from: 'inventory', label: 'Selling price', render: (v) => formatCurrency(v) },
        { key: 'cost', from: 'inventory', label: 'Actual cost', render: (v) => formatCurrency(v ?? 0) },
        { key: 'mrp', from: 'inventory', label: 'MRP', render: (v) => formatCurrency(v ?? 0) },
        {
          key: 'stockQty',
          from: 'inventory',
          label: 'Stock',
          render: (v) => <Badge variant={v > 0 ? 'green' : 'red'}>{v} units</Badge>,
        },
        {
          key: '_id',
          from: 'inventory',
          label: '',
          render: (_, row) => (
            <ProductActions
              onEdit={() => onEdit(row)}
              onDelete={() => onDelete(String(row._id!))}
            />
          ),
        },
      ]}
      data={products}
      emptyMessage={isLoading ? 'Loading…' : 'No products yet. Add your first product.'}
    />
  )
}
