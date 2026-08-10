import { Pencil, Trash2 } from 'lucide-react'

interface ProductActionsProps {
  onEdit: () => void
  onDelete: () => void
}

export function ProductActions({ onEdit, onDelete }: ProductActionsProps) {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className="text-gray-400 hover:text-indigo-600">
        <Pencil size={14} />
      </button>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-600">
        <Trash2 size={14} />
      </button>
    </div>
  )
}
