'use client'
import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { normalizeImportRow, type ProductImportPayload } from '@/lib/inventory-import'

interface BulkImportPanelProps {
  onImportSuccess: () => void
}

export function BulkImportPanel({ onImportSuccess }: BulkImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  async function downloadSampleTemplate() {
    const { utils, writeFile } = await import('xlsx')
    const headers = ['name', 'sku', 'category', 'price', 'cost', 'stockQty', 'taxRate', 'description']
    const rows = [
      ['Milk Powder', 'MILK-001', 'Beverages', 250, 180, 50, 5, 'Daily essentials'],
      ['Soap', 'SOAP-002', 'Household', 45, 28, 120, 5, 'Bathing soap'],
    ]
    const worksheet = utils.aoa_to_sheet([headers, ...rows])
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, worksheet, 'Inventory')
    writeFile(workbook, 'inventory-template.xlsx')
  }

  async function handleBulkImport(file: File | null) {
    if (!file) return

    const tick = (value: number) =>
      new Promise<void>((resolve) => {
        setImportProgress(value)
        window.setTimeout(resolve, 180)
      })

    try {
      setImporting(true)
      setImportProgress(0)
      setImportError(null)
      setImportMessage(null)

      await tick(10)

      const { read, utils } = await import('xlsx')
      const workbook = read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>

      await tick(45)

      const productsToCreate = rows
        .map((row) => normalizeImportRow(row as Record<string, unknown>))
        .filter((row): row is ProductImportPayload => Boolean(row))

      if (!productsToCreate.length) {
        throw new Error('The selected file does not contain any usable inventory rows.')
      }

      await tick(70)

      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsToCreate }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to import inventory from the selected file.')
      }

      await tick(100)
      setImportMessage(`Imported ${payload.count ?? productsToCreate.length} products successfully.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onImportSuccess()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to import inventory.')
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 p-4 text-sm text-indigo-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <FileSpreadsheet size={16} /> Bulk upload format
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={downloadSampleTemplate}>
              <Download size={14} /> Sample sheet
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Import Excel
            </Button>
          </div>
        </div>
        <p className="mt-2 text-indigo-800">
          Upload a .xlsx or .csv file with the columns shown in the sample template. The importer will
          create products using the same structure as manual entry.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => handleBulkImport(e.target.files?.[0] ?? null)}
        />
      </div>

      {importing && (
        <div className="rounded-lg border border-indigo-200 bg-white px-3 py-3 text-sm text-indigo-700">
          <div className="mb-2 flex items-center justify-between">
            <span>Importing inventory…</span>
            <span>{importProgress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-indigo-100">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {importMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {importMessage}
        </div>
      )}
      {importError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {importError}
        </div>
      )}
    </>
  )
}
