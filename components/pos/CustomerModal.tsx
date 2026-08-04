import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { CustomerFormData } from './types'

interface CustomerModalProps {
  open: boolean
  form: CustomerFormData
  error: string
  creating: boolean
  onClose: () => void
  onChange: (field: keyof CustomerFormData, value: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export function CustomerModal({ open, form, error, creating, onClose, onChange, onSubmit }: CustomerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Create customer">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Name" value={form.name} onChange={(e) => onChange('name', e.target.value)} required />
        <Input label="Email" type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} />
        <Input label="Phone" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={creating}>
            {creating ? 'Creating…' : 'Create customer'}
          </Button>
          <Button type="button" variant="secondary" className="text-black" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
