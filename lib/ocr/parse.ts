import { normalizeCurrency, normalizeDate, normalizeQty, pickLargestNumber } from './normalize'
import type { OcrExtractedData, OcrItemCandidate, OcrParseWarning, OcrSupplierCandidate } from './types'

const GST_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]\b/
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE_REGEX = /(?:\+91[-\s]?)?[6-9]\d{9}\b/

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function extractLabeledValue(lines: string[], labels: string[]): string | undefined {
  for (const line of lines) {
    const normalized = compactWhitespace(line)
    for (const label of labels) {
      const regex = new RegExp(`^${label}\\s*[:\\-]\\s*(.+)$`, 'i')
      const match = normalized.match(regex)
      if (match?.[1]) return match[1].trim()
    }
  }
  return undefined
}

function parseSupplier(lines: string[]): OcrSupplierCandidate {
  const supplier: OcrSupplierCandidate = {}

  const labeledName = extractLabeledValue(lines, ['supplier\\s*name', 'vendor', 'supplier'])
  if (labeledName) supplier.name = labeledName

  const labeledPhone = extractLabeledValue(lines, ['contact', 'phone', 'mobile'])
  if (labeledPhone) {
    const normalizedPhone = labeledPhone.replace(/\D/g, '').slice(-10)
    if (normalizedPhone.length === 10) supplier.phone = normalizedPhone
  }

  const labeledEmail = extractLabeledValue(lines, ['email', 'e-?mail'])
  if (labeledEmail) {
    const email = labeledEmail.match(EMAIL_REGEX)?.[0]
    if (email) supplier.email = email.toLowerCase()
  }

  const labeledGst = extractLabeledValue(lines, ['gstin', 'gst'])
  if (labeledGst) {
    const gst = labeledGst.match(GST_REGEX)?.[0]
    if (gst) supplier.gstNumber = gst
  }

  for (const line of lines.slice(0, 8)) {
    const email = line.match(EMAIL_REGEX)?.[0]
    if (email && !supplier.email) supplier.email = email.toLowerCase()

    const phone = line.match(PHONE_REGEX)?.[0]
    if (phone && !supplier.phone) supplier.phone = phone.replace(/\D/g, '').slice(-10)

    const gst = line.match(GST_REGEX)?.[0]
    if (gst && !supplier.gstNumber) supplier.gstNumber = gst
  }

  const blockedWords = /(invoice|bill|tax|date|phone|email|gst|qty|total|amount|no\.?)/i
  if (!supplier.name) {
    const nameCandidate = lines
      .map((line) => compactWhitespace(line))
      .find((line) => line.length >= 3 && line.length <= 60 && !blockedWords.test(line))

    if (nameCandidate) supplier.name = nameCandidate
  }

  return supplier
}

function parseBillNumber(text: string): string | undefined {
  const match = text.match(
    /(?:bill|invoice|po|purchase\s*order)\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9\/-]{3,})/i
  )
  return match?.[1]
}

function parseBillDate(text: string): string | undefined {
  const line = text
    .split(/\r?\n/)
    .find((entry) => /(po\s*date|invoice\s*date|bill\s*date|date)/i.test(entry))
  if (!line) return undefined
  return normalizeDate(line)
}

function parseTotals(text: string): { subtotal?: number; taxAmount?: number; total?: number } {
  const lines = text.split(/\r?\n/)
  let subtotal: number | undefined
  let taxAmount: number | undefined
  let total: number | undefined

  const grandTotalLine = lines.find((line) => /grand\s*total/i.test(line))
  if (grandTotalLine) {
    const matches = grandTotalLine.match(/[\d,.]+(?:\.\d{1,2})?/g)
    if (matches?.length) {
      total = pickLargestNumber(matches)
    }
  }

  for (const line of lines) {
    const numberMatches = line.match(/[\d,.]+(?:\.\d{1,2})?/g)
    if (!numberMatches || numberMatches.length === 0) continue

    const best = pickLargestNumber(numberMatches)
    if (best === undefined) continue

    if (!subtotal && /sub\s*total/i.test(line)) subtotal = best
    if (!taxAmount && /(tax|cgst|sgst|igst|vat)/i.test(line)) taxAmount = best
    if (!total && /grand\s*total|total\s*amount|amount\s*payable|net\s*amount|^\s*total\s*$/i.test(line)) {
      total = best
    }
  }

  if (!total) {
    const candidates = lines.filter((line) => /total/i.test(line))
    const allNumbers = candidates.flatMap((line) => line.match(/[\d,.]+(?:\.\d{1,2})?/g) ?? [])
    total = pickLargestNumber(allNumbers)
  }

  return { subtotal, taxAmount, total }
}

function parseItems(lines: string[]): OcrItemCandidate[] {
  const parsedItems: OcrItemCandidate[] = []

  for (const line of lines) {
    const cleaned = compactWhitespace(line)
    if (!cleaned || cleaned.length < 6) continue
    if (/invoice|bill|tax|gst|amount|total|date|phone|email/i.test(cleaned)) continue

    // Table-like rows with right-aligned numeric columns, e.g.
    // 1 105 Surf Excel 5 kg 34019011 20 nos 600.00 5% 12600.00
    const tokens = cleaned.split(/\s+/)
    if (tokens.length >= 9 && /^\d+$/.test(tokens[0])) {
      const amountToken = tokens[tokens.length - 1]
      const taxToken = tokens[tokens.length - 2]
      const rateToken = tokens[tokens.length - 3]
      const qtyToken = tokens[tokens.length - 5]

      const amount = normalizeCurrency(amountToken)
      const rate = normalizeCurrency(rateToken)
      const qty = normalizeQty(qtyToken)
      const parsedTax = Number((taxToken || '').replace('%', ''))
      const taxRate = Number.isFinite(parsedTax) ? Math.max(0, Math.min(100, parsedTax)) : 0

      const nameStart = 2
      const nameEnd = Math.max(nameStart, tokens.length - 6)
      const name = compactWhitespace(tokens.slice(nameStart, nameEnd).join(' '))

      if (name && qty && rate !== undefined && amount !== undefined) {
        parsedItems.push({
          name,
          qty,
          unitCost: rate,
          taxRate,
          total: amount,
        })
        continue
      }
    }

    // Fallback pattern: ItemName 2 100.00 200.00
    const match = cleaned.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)$/)
    if (!match) continue

    const name = compactWhitespace(match[1])
    const qty = normalizeQty(match[2])
    const unitCost = normalizeCurrency(match[3])
    const total = normalizeCurrency(match[4])

    if (!name || !qty || unitCost === undefined || total === undefined) continue

    parsedItems.push({
      name,
      qty,
      unitCost,
      taxRate: 0,
      total,
    })
  }

  return parsedItems
}

function computeConfidence(input: {
  supplier: OcrSupplierCandidate
  items: OcrItemCandidate[]
  total?: number
  billDate?: string
}): number {
  let score = 0
  if (input.supplier.name) score += 0.25
  if (input.supplier.phone || input.supplier.email) score += 0.2
  if (input.items.length > 0) score += 0.3
  if (input.total !== undefined) score += 0.2
  if (input.billDate) score += 0.05
  return Math.max(0, Math.min(1, score))
}

export function parseBillOcrText(rawText: string): OcrExtractedData {
  const text = rawText.trim()
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const supplier = parseSupplier(lines)
  const billNumber = parseBillNumber(text)
  const billDate = parseBillDate(text)
  const items = parseItems(lines)
  const totals = parseTotals(text)

  const warnings: OcrParseWarning[] = []
  if (!supplier.name) {
    warnings.push({ code: 'SUPPLIER_NAME_MISSING', message: 'Could not confidently detect supplier name.' })
  }
  if (!supplier.phone && !supplier.email) {
    warnings.push({
      code: 'SUPPLIER_CONTACT_MISSING',
      message: 'Supplier phone/email is missing. Draft supplier creation needs one of these.',
    })
  }
  if (items.length === 0) {
    warnings.push({ code: 'ITEMS_MISSING', message: 'Could not confidently detect bill line items.' })
  }
  if (totals.total === undefined) {
    warnings.push({ code: 'TOTAL_MISSING', message: 'Could not confidently detect final total amount.' })
  }

  const confidence = computeConfidence({
    supplier,
    items,
    total: totals.total,
    billDate,
  })

  return {
    rawText: text,
    supplier,
    billNumber,
    billDate,
    items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    confidence,
    warnings,
  }
}
