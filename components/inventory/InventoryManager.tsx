'use client'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Grid3X3, List, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProductGrid } from './ProductGrid'
import { ProductTable } from './ProductTable'
import { ProductModal } from './ProductModal'
import { BulkImportPanel } from './BulkImportPanel'
import { PaginationBar } from './PaginationBar'
import type { ProductForm } from './types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function InventoryManager() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductForm | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  const searchTerm = searchQuery.trim()
  const productsUrl = searchTerm
    ? `/api/products?limit=10&page=${page}&search=${encodeURIComponent(searchTerm)}`
    : `/api/products?limit=10&page=${page}`

  const { data, isLoading, mutate: mutateProducts } = useSWR(productsUrl, fetcher)
  const products = (data?.data ?? []) as ProductForm[]
  const total = Number(data?.total ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / 10))

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1]
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, totalPages]
    if (page >= totalPages - 2) return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, page - 1, page, page + 1, totalPages]
  }, [page, totalPages])

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(product: ProductForm) {
    setEditing(product)
    setOpen(true)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    mutateProducts()
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid3X3 size={14} /> Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List size={14} /> List
            </button>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus size={14} /> Add product
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <input
          type="text"
          placeholder="Search products by name, SKU, or category..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setPage(1) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <BulkImportPanel onImportSuccess={() => mutateProducts()} />

      {viewMode === 'grid' ? (
        <ProductGrid
          products={products}
          isLoading={isLoading}
          onEdit={openEdit}
          onDelete={deleteProduct}
        />
      ) : (
        <ProductTable
          products={products}
          isLoading={isLoading}
          onEdit={openEdit}
          onDelete={deleteProduct}
        />
      )}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageNumbers={pageNumbers}
        onPageChange={setPage}
      />

      <ProductModal
        open={open}
        editing={editing}
        onClose={() => setOpen(false)}
        onSuccess={() => mutateProducts()}
      />
    </div>
  )
}
