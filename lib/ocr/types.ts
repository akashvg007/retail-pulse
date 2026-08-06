export interface OcrSupplierCandidate {
  name?: string
  phone?: string
  email?: string
  gstNumber?: string
}

export interface OcrItemCandidate {
  name: string
  qty: number
  unitCost: number
  taxRate: number
  total: number
}

export interface OcrParseWarning {
  code: string
  message: string
}

export interface OcrExtractedData {
  rawText: string
  supplier: OcrSupplierCandidate
  billNumber?: string
  billDate?: string
  items: OcrItemCandidate[]
  subtotal?: number
  taxAmount?: number
  total?: number
  confidence: number
  warnings: OcrParseWarning[]
}

export const OCR_AUTOFILL_CONFIDENCE_THRESHOLD = 0.62
