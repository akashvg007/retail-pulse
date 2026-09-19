'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, RotateCcw, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import type {
  InvoicePrintTemplate,
  InvoiceTemplateElement,
  InvoiceTemplateLayout,
  InvoiceTemplateSection,
  InvoiceTemplateSettings,
} from '@/app/dashboard/invoices/type'

const formats: Array<{ value: InvoicePrintTemplate; label: string; ratio: string }> = [
  { value: 'standard-a4', label: 'A4 Standard', ratio: '210 / 297' },
  { value: 'standard-a5', label: 'A5 Standard', ratio: '148 / 210' },
  { value: 'minimal-a4', label: 'A4 Minimal', ratio: '210 / 297' },
  { value: 'thermal-detailed', label: 'Thermal Detailed', ratio: '80 / 180' },
  { value: 'thermal-compact', label: 'Thermal Compact', ratio: '80 / 140' },
]

const sections: Array<{ key: InvoiceTemplateSection; label: string; description: string }> = [
  { key: 'branding', label: 'Business branding', description: 'Logo, company name, address and contact' },
  { key: 'metadata', label: 'Invoice metadata', description: 'Invoice number, dates, status and staff' },
  { key: 'customer', label: 'Customer details', description: 'Customer name, address and tax details' },
  { key: 'items', label: 'Line items', description: 'Products, quantities, prices and taxes' },
  { key: 'totals', label: 'Totals', description: 'Subtotal, tax, discount and total' },
  { key: 'notes', label: 'Notes and footer', description: 'Notes, terms and footer text' },
  { key: 'savings', label: 'Savings summary', description: 'Total saved against product MRP' },
]

const emptyLayout = (): InvoiceTemplateLayout => ({ version: 1, customized: true, elements: [] })

function sectionLabel(section: InvoiceTemplateSection) {
  return sections.find((item) => item.key === section)?.label ?? section
}

export default function InvoiceTemplateEditor() {
  const [format, setFormat] = useState<InvoicePrintTemplate>('standard-a4')
  const [template, setTemplate] = useState<InvoiceTemplateSettings>({ version: 1, layouts: {} })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const idCounterRef = useRef(0)

  useEffect(() => {
    fetch('/api/tenants/settings')
      .then((response) => response.json())
      .then((result) => {
        setTemplate(result.data?.invoiceTemplate ?? { version: 1, layouts: {} })
        setLoading(false)
      })
      .catch(() => {
        setMessage('Unable to load invoice templates')
        setLoading(false)
      })
  }, [])

  const currentLayout = template.layouts[format]
  const elements = useMemo(() => currentLayout?.elements ?? [], [currentLayout])
  const selectedElement = elements.find((element) => element.id === selectedId)
  const currentFormat = formats.find((item) => item.value === format) ?? formats[0]

  const usedSections = useMemo(() => new Set(elements.map((element) => element.section)), [elements])

  function updateLayout(nextLayout: InvoiceTemplateLayout) {
    setTemplate((current) => ({
      ...current,
      version: 1,
      layouts: { ...current.layouts, [format]: nextLayout },
    }))
    setMessage('')
  }

  function addSection(section: InvoiceTemplateSection, x = 8, y = 8) {
    if (usedSections.has(section)) return
    idCounterRef.current += 1
    const element: InvoiceTemplateElement = {
      id: `${section}-${idCounterRef.current}`,
      section,
      x: Math.min(92, x),
      y: Math.min(92, y),
      width: section === 'items' ? 84 : 38,
      height: section === 'items' ? 20 : 12,
      zIndex: elements.length,
    }
    updateLayout({ ...(currentLayout ?? emptyLayout()), elements: [...elements, element] })
    setSelectedId(element.id)
  }

  function moveElement(id: string, clientX: number, clientY: number) {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const element = elements.find((item) => item.id === id)
    if (!element) return
    const x = Math.max(0, Math.min(100 - element.width, ((clientX - rect.left) / rect.width) * 100 - element.width / 2))
    const y = Math.max(0, Math.min(100 - element.height, ((clientY - rect.top) / rect.height) * 100 - element.height / 2))
    updateLayout({ ...(currentLayout ?? emptyLayout()), elements: elements.map((item) => item.id === id ? { ...item, x, y } : item) })
  }

  function removeSelected() {
    if (!selectedId) return
    updateLayout({ ...(currentLayout ?? emptyLayout()), elements: elements.filter((element) => element.id !== selectedId) })
    setSelectedId(null)
  }

  function updateSelectedSize(field: 'width' | 'height', value: number) {
    if (!selectedId) return
    const nextValue = Math.max(1, Math.min(100, value || 1))
    updateLayout({
      ...(currentLayout ?? emptyLayout()),
      elements: elements.map((element) => {
        if (element.id !== selectedId) return element
        const boundedValue = field === 'width' ? Math.min(nextValue, 100 - element.x) : Math.min(nextValue, 100 - element.y)
        return { ...element, [field]: boundedValue }
      }),
    })
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/tenants/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { invoiceTemplate: template } }),
    })
    setSaving(false)
    setMessage(response.ok ? 'Template saved' : 'Unable to save template')
  }

  function resetFormat() {
    updateLayout(emptyLayout())
    setSelectedId(null)
  }

  if (loading) return <p className="text-sm text-gray-500">Loading invoice template editor...</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Invoice template editor</h2>
          <p className="mt-1 text-sm text-gray-500">Start with a blank canvas and place each invoice section where it belongs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Invoice format"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            value={format}
            onChange={(event) => { setFormat(event.target.value as InvoicePrintTemplate); setSelectedId(null) }}
          >
            {formats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <Button type="button" variant="secondary" onClick={resetFormat}><RotateCcw size={14} /> Reset format</Button>
          <Button type="button" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Saving...' : 'Save template'}</Button>
        </div>
      </div>

      {message && <p className="text-sm text-gray-600" role="status">{message}</p>}

      <div className="grid gap-4 xl:grid-cols-[250px_minmax(420px,1fr)_280px]">
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-800">Sections</h3></CardHeader>
          <CardBody className="space-y-2">
            {sections.map((section) => {
              const used = usedSections.has(section.key)
              return (
                <button
                  key={section.key}
                  type="button"
                  draggable={!used}
                  disabled={used}
                  onDragStart={(event) => event.dataTransfer.setData('application/x-invoice-section', section.key)}
                  onClick={() => addSection(section.key)}
                  className="flex w-full items-start gap-2 rounded-lg border border-gray-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <GripVertical size={16} className="mt-0.5 shrink-0 text-gray-400" />
                  <span><span className="block text-sm font-medium text-gray-800">{section.label}</span><span className="mt-0.5 block text-xs text-gray-500">{used ? 'Already on canvas' : section.description}</span></span>
                </button>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-800">{currentFormat.label} canvas</h3></CardHeader>
          <CardBody>
            <div
              ref={canvasRef}
              className="relative mx-auto max-w-[620px] overflow-hidden border-2 border-dashed border-gray-300 bg-white shadow-inner"
              style={{ aspectRatio: currentFormat.ratio }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const section = event.dataTransfer.getData('application/x-invoice-section') as InvoiceTemplateSection
                const id = event.dataTransfer.getData('application/x-invoice-element')
                if (section) addSection(section, ((event.clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0)) / (canvasRef.current?.getBoundingClientRect().width ?? 1)) * 100 - 15, ((event.clientY - (canvasRef.current?.getBoundingClientRect().top ?? 0)) / (canvasRef.current?.getBoundingClientRect().height ?? 1)) * 100 - 6)
                if (id) moveElement(id, event.clientX, event.clientY)
              }}
            >
              {elements.length === 0 && <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-gray-400">Drag sections here or click a section to add it.</p>}
              {elements.map((element) => (
                <div
                  key={element.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('application/x-invoice-element', element.id)}
                  onClick={() => setSelectedId(element.id)}
                  className={`absolute cursor-move overflow-hidden rounded border p-2 text-xs ${selectedId === element.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-300 bg-gray-50'}`}
                  style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%`, zIndex: element.zIndex }}
                >
                  <span className="font-semibold text-gray-700">{sectionLabel(element.section)}</span>
                  <span className="mt-1 block text-gray-500">Sample preview</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-800">Preview</h3></CardHeader>
          <CardBody>
            <div className="relative mx-auto max-w-[260px] overflow-hidden border border-gray-200 bg-white p-3 text-[8px] text-gray-600" style={{ aspectRatio: currentFormat.ratio }}>
              {elements.length === 0 ? <p className="flex h-full items-center justify-center text-center text-gray-400">Your saved invoice will appear here.</p> : elements.map((element) => <div key={element.id} className="absolute overflow-hidden border border-gray-200 bg-gray-50 p-1" style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%`, zIndex: element.zIndex }}>{sectionLabel(element.section)}</div>)}
            </div>
            {selectedElement && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-800">Selected: {sectionLabel(selectedElement.section)}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-600">Width (%)<input className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" type="number" min="1" max="100" value={Math.round(selectedElement.width)} onChange={(event) => updateSelectedSize('width', Number(event.target.value))} /></label>
                  <label className="text-xs text-gray-600">Height (%)<input className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" type="number" min="1" max="100" value={Math.round(selectedElement.height)} onChange={(event) => updateSelectedSize('height', Number(event.target.value))} /></label>
                </div>
                <button type="button" onClick={removeSelected} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"><Trash2 size={14} /> Remove section</button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
