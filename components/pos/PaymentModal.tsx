import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import type { PaymentOption } from './types'

interface PaymentModalProps {
  open: boolean
  payableAmount: number
  paymentOption: PaymentOption
  cashReceived: string
  creditDueDate: string
  paymentError: string
  paying: boolean
  cartCount: number
  cashBalance: number
  onClose: () => void
  onSelectPaymentOption: (option: PaymentOption) => void
  onCashReceivedChange: (value: string) => void
  onCreditDueDateChange: (value: string) => void
  onConfirmPayment: () => void
}

export function PaymentModal({
  open,
  payableAmount,
  paymentOption,
  cashReceived,
  creditDueDate,
  paymentError,
  paying,
  cartCount,
  cashBalance,
  onClose,
  onSelectPaymentOption,
  onCashReceivedChange,
  onCreditDueDateChange,
  onConfirmPayment,
}: PaymentModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Select payment option">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">Payable amount</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(payableAmount)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['online', 'upi', 'cash', 'credit'] as PaymentOption[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSelectPaymentOption(option)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                paymentOption === option
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>

        {paymentOption === 'cash' && (
          <div className="space-y-2 rounded-lg border border-gray-200 px-3 py-3">
            <Input
              label="Amount received"
              type="number"
              min={0}
              step="0.01"
              value={cashReceived}
              onChange={(e) => onCashReceivedChange(e.target.value)}
              placeholder="Enter amount given by customer"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Balance</span>
              <span className={cashBalance < 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                {formatCurrency(cashBalance)}
              </span>
            </div>
            {cashBalance < 0 && <p className="text-xs text-red-600">Received amount is less than total payable amount.</p>}
          </div>
        )}

        {paymentOption === 'credit' && (
          <div className="space-y-2 rounded-lg border border-gray-200 px-3 py-3">
            <Input label="Due date" type="date" value={creditDueDate} onChange={(e) => onCreditDueDateChange(e.target.value)} />
            <p className="text-xs text-gray-500">This will create an invoice for the customer and mark it as a credit sale.</p>
          </div>
        )}

        {paymentError && <p className="text-xs text-red-600">{paymentError}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="text-black" onClick={onClose} disabled={paying}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={onConfirmPayment} disabled={paying || cartCount === 0}>
            {paying ? 'Processing…' : 'Confirm payment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
