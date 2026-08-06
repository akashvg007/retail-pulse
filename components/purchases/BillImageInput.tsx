'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import type { BillCaptureSource } from './types'

interface BillImageInputProps {
  busy?: boolean
  fileName?: string | null
  error?: string | null
  onFileSelected: (file: File, source: BillCaptureSource) => void
  onClear?: () => void
}

export default function BillImageInput({
  busy = false,
  fileName,
  error,
  onFileSelected,
  onClear,
}: BillImageInputProps) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function handleFileInput(
    event: React.ChangeEvent<HTMLInputElement>,
    source: BillCaptureSource
  ) {
    const file = event.target.files?.[0]
    if (!file) return
    onFileSelected(file, source)
    event.target.value = ''
  }

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-sm font-medium text-gray-800">Bill image (optional)</p>
      <p className="text-xs text-gray-500">
        Upload a bill image or capture one using your camera, then review extracted details before filling the order.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => uploadRef.current?.click()}>
          Upload bill
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => cameraRef.current?.click()}>
          Open camera
        </Button>
        {fileName && onClear ? (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClear}>
            Clear bill
          </Button>
        ) : null}
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => handleFileInput(event, 'upload')}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFileInput(event, 'camera')}
      />

      {fileName ? <p className="text-xs text-gray-700">Selected: {fileName}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
