import { useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

interface ProductActionsProps {
  onEdit: () => void
  onDelete: () => void
}

export function ProductActions({ onEdit, onDelete }: ProductActionsProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        title="Product actions"
      >
        <MoreVertical size={18} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-8 z-10 min-w-36 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
          role="menu"
          aria-label="Product actions"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onEdit() }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}
