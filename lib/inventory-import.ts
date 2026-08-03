import { productSchema } from '@/lib/validations'
import { z } from 'zod'

export type ProductImportPayload = z.infer<typeof productSchema> & { _id?: never }

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

const getValue = (row: Record<string, unknown>, aliases: string[]) => {
  const normalized = new Map<string, unknown>()

  Object.entries(row).forEach(([key, value]) => {
    normalized.set(normalizeKey(key), value)
  })

  for (const alias of aliases) {
    const value = normalized.get(normalizeKey(alias))
    if (value !== undefined && value !== null && value !== '') return value
  }

  return undefined
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return fallback
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function toString(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

export function normalizeImportRow(row: Record<string, unknown>): ProductImportPayload | null {
  const name = toString(getValue(row, ['name', 'productname', 'itemname']))
  const sku = toString(getValue(row, ['sku', 'code', 'itemcode']))

  if (!name || !sku) return null

  const normalized = {
    name,
    sku,
    description: toString(getValue(row, ['description', 'desc', 'details'])) || undefined,
    category: toString(getValue(row, ['category', 'department'])) || 'General',
    price: toNumber(getValue(row, ['price', 'unitprice']), 0),
    cost: toNumber(getValue(row, ['cost', 'unitcost']), 0),
    stockQty: Math.max(0, Math.floor(toNumber(getValue(row, ['stockqty', 'stock', 'qty', 'quantity']), 0))),
    taxRate: Math.max(0, Math.min(100, toNumber(getValue(row, ['taxrate', 'tax']), 18))),
  }

  const parsed = productSchema.omit({ _id: true }).safeParse(normalized)
  if (!parsed.success) return null

  return parsed.data
}
