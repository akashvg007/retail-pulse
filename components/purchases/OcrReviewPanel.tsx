'use client'

import { Button } from '@/components/ui/Button'
import { OCR_AUTOFILL_CONFIDENCE_THRESHOLD, type OcrExtractedData } from '@/lib/ocr/types'

interface OcrReviewPanelProps {
  data: OcrExtractedData
  creatingSupplierDraft?: boolean
  onApply: () => void
  onCreateSupplierDraft: () => void
  onDismiss: () => void
}

export default function OcrReviewPanel({
  data,
  creatingSupplierDraft = false,
  onApply,
  onCreateSupplierDraft,
  onDismiss,
}: OcrReviewPanelProps) {
  const canAutofill = data.confidence >= OCR_AUTOFILL_CONFIDENCE_THRESHOLD
  const hasSupplierDraftMinimum = Boolean(data.supplier.name && (data.supplier.phone || data.supplier.email))

  return (
    <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
      <div>
        <p className="text-sm font-semibold text-indigo-900">Bill OCR Review</p>
        <p className="text-xs text-indigo-700">
          Confidence {Math.round(data.confidence * 100)}%. Autofill requires at least {Math.round(OCR_AUTOFILL_CONFIDENCE_THRESHOLD * 100)}%.
        </p>
      </div>

      {!canAutofill ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-800">
          OCR confidence is low. Review extracted text and continue with manual form entry.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 text-xs text-gray-700 sm:grid-cols-2">
        <div><span className="font-medium">Supplier:</span> {data.supplier.name || '—'}</div>
        <div><span className="font-medium">Phone:</span> {data.supplier.phone || '—'}</div>
        <div><span className="font-medium">Email:</span> {data.supplier.email || '—'}</div>
        <div><span className="font-medium">GST:</span> {data.supplier.gstNumber || '—'}</div>
        <div><span className="font-medium">Bill no:</span> {data.billNumber || '—'}</div>
        <div><span className="font-medium">Bill date:</span> {data.billDate || '—'}</div>
      </div>

      {data.items.length > 0 ? (
        <div className="rounded-md border border-indigo-100 bg-white p-2">
          <p className="mb-2 text-xs font-medium text-gray-700">Detected items ({data.items.length})</p>
          <div className="space-y-1">
            {data.items.slice(0, 5).map((item, index) => (
              <div key={`ocr-item-${index}`} className="grid grid-cols-[minmax(0,1fr)_56px_84px] gap-2 text-xs text-gray-700">
                <span className="truncate">{item.name}</span>
                <span>Qty {item.qty}</span>
                <span className="text-right">{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {data.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-xs text-amber-700">
          {data.warnings.map((warning) => (
            <li key={warning.code}>{warning.message}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={!canAutofill} onClick={onApply}>
          Autofill form
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!hasSupplierDraftMinimum || creatingSupplierDraft}
          onClick={onCreateSupplierDraft}
        >
          {creatingSupplierDraft ? 'Creating supplier…' : 'Create supplier draft'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss OCR data
        </Button>
      </div>

      <details>
        <summary className="cursor-pointer text-xs text-indigo-700">Show extracted raw text</summary>
        <pre className="mt-2 max-h-36 overflow-auto rounded bg-white p-2 text-[11px] text-gray-700">{data.rawText || 'No text extracted'}</pre>
      </details>
    </div>
  )
}
