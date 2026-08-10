import { Button } from '@/components/ui/Button'

interface PaginationBarProps {
  page: number
  totalPages: number
  total: number
  pageNumbers: number[]
  onPageChange: (page: number) => void
}

export function PaginationBar({ page, totalPages, total, pageNumbers, onPageChange }: PaginationBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
      <span>
        Showing page {page} of {totalPages} • {total} products total
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        {pageNumbers.map((n) => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`h-8 w-8 rounded-md border text-sm ${
              n === page
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {n}
          </button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
