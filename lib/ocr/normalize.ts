function cleanNumberValue(value: string): number | null {
  const normalized = value.replace(/[,\s]/g, '').replace(/[^0-9.-]/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function pickLargestNumber(values: string[]): number | undefined {
  let largest: number | undefined
  for (const value of values) {
    const parsed = cleanNumberValue(value)
    if (parsed === null) continue
    if (largest === undefined || parsed > largest) largest = parsed
  }
  return largest
}

export function normalizeCurrency(value: string): number | undefined {
  const parsed = cleanNumberValue(value)
  if (parsed === null) return undefined
  return Math.max(0, parsed)
}

export function normalizeQty(value: string): number | undefined {
  const parsed = cleanNumberValue(value)
  if (parsed === null) return undefined
  if (parsed <= 0) return undefined
  return Math.max(1, Math.round(parsed))
}

export function normalizeDate(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const ymdMatch = trimmed.match(/\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/)
  if (ymdMatch) {
    const y = Number(ymdMatch[1])
    const m = Number(ymdMatch[2])
    const d = Number(ymdMatch[3])
    if (y >= 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  const dmyMatch = trimmed.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/)
  if (dmyMatch) {
    const d = Number(dmyMatch[1])
    const m = Number(dmyMatch[2])
    const yRaw = Number(dmyMatch[3])
    const y = yRaw < 100 ? 2000 + yRaw : yRaw
    if (y >= 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  return undefined
}
