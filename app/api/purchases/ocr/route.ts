import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireFeature } from '@/lib/tenant'
import type { OcrExtractedData, OcrParseWarning } from '@/lib/ocr/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const supportedMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
])

const geminiExtractionSchema = z.object({
  supplier: z.object({
    name: z.string().nullish(),
    phone: z.string().nullish(),
    email: z.string().nullish(),
    gstNumber: z.string().nullish(),
  }).default({}),
  billNumber: z.string().nullish(),
  billDate: z.string().nullish(),
  items: z.array(z.object({
    name: z.string(),
    hsnCode: z.string().nullish(),
    qty: z.number().nonnegative(),
    unitCost: z.number().nonnegative(),
    discountPercentage: z.number().min(0).max(100).nullish(),
    discountAmount: z.number().nonnegative().nullish(),
    taxRate: z.number().min(0).max(100).default(0),
    mrp: z.number().nonnegative().nullish(),
    mrpDiscount: z.number().min(0).max(100).nullish(),
    price: z.number().nonnegative().nullish(),
    total: z.number().nonnegative().optional(),
  })).default([]),
  subtotal: z.number().nonnegative().nullish(),
  taxAmount: z.number().nonnegative().nullish(),
  total: z.number().nonnegative().nullish(),
})

const responseSchema = {
  type: 'object',
  properties: {
    supplier: {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        phone: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
        gstNumber: { type: ['string', 'null'] },
      },
      required: ['name', 'phone', 'email', 'gstNumber'],
    },
    billNumber: { type: ['string', 'null'] },
    billDate: { type: ['string', 'null'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          hsnCode: { type: ['string', 'null'] },
          qty: { type: 'number' },
          unitCost: { type: 'number' },
          discountPercentage: { type: ['number', 'null'] },
          discountAmount: { type: ['number', 'null'] },
          taxRate: { type: 'number' },
          mrp: { type: ['number', 'null'] },
          mrpDiscount: { type: ['number', 'null'] },
          price: { type: ['number', 'null'] },
          total: { type: 'number' },
        },
        required: ['name', 'hsnCode', 'qty', 'unitCost', 'discountPercentage', 'discountAmount', 'taxRate', 'mrp', 'mrpDiscount', 'price', 'total'],
      },
    },
    subtotal: { type: ['number', 'null'] },
    taxAmount: { type: ['number', 'null'] },
    total: { type: ['number', 'null'] },
  },
  required: ['supplier', 'billNumber', 'billDate', 'items', 'subtotal', 'taxAmount', 'total'],
}

function buildWarnings(data: z.infer<typeof geminiExtractionSchema>): OcrParseWarning[] {
  const warnings: OcrParseWarning[] = []
  if (!data.supplier.name) warnings.push({ code: 'SUPPLIER_NAME_MISSING', message: 'Could not confidently detect supplier name.' })
  if (!data.supplier.phone && !data.supplier.email) {
    warnings.push({ code: 'SUPPLIER_CONTACT_MISSING', message: 'Supplier phone/email is missing. Draft supplier creation needs one of these.' })
  }
  if (data.items.length === 0) warnings.push({ code: 'ITEMS_MISSING', message: 'Could not confidently detect bill line items.' })
  if (data.total === undefined || data.total === null) warnings.push({ code: 'TOTAL_MISSING', message: 'Could not confidently detect final total amount.' })
  return warnings
}

function computeConfidence(data: z.infer<typeof geminiExtractionSchema>) {
  const warnings = buildWarnings(data)
  let confidence = 1
  confidence -= warnings.some((warning) => warning.code === 'SUPPLIER_NAME_MISSING') ? 0.25 : 0
  confidence -= warnings.some((warning) => warning.code === 'SUPPLIER_CONTACT_MISSING') ? 0.2 : 0
  confidence -= warnings.some((warning) => warning.code === 'ITEMS_MISSING') ? 0.3 : 0
  confidence -= warnings.some((warning) => warning.code === 'TOTAL_MISSING') ? 0.2 : 0
  return { confidence: Math.max(0, Math.min(1, confidence)), warnings }
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx

  const denied = await requireFeature(ctx, 'purchase_bill_ocr')
  if (denied) return denied

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Gemini OCR is not configured' }, { status: 503 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Bill file is required' }, { status: 400 })
  if (!supportedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: 'Only PDF, PNG, JPEG, and WebP files are supported' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Please upload a file smaller than 10 MB' }, { status: 413 })

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  const prompt = `Extract purchase invoice details from this document. Return only the requested JSON fields.
Use YYYY-MM-DD for billDate when it is clear. Preserve all line items. Set missing values to null, and use 0 only for a clearly zero numeric value.
For every line item, extract the HSN/SAC code, quantity, purchase rate (unitCost), discount percentage and amount, tax percentage, MRP, MRP discount percentage, selling price, and line total when they are visible. Use price for the post-discount selling price, not the purchase rate. If a discount is shown as a percentage, calculate discountAmount from quantity and unitCost when possible; if only an amount is shown, calculate discountPercentage when possible. Do not infer MRP, discounts, or price from unrelated amounts.
Calculate total when line items make it possible. Do not invent supplier contact details or prices.`
  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          model,
          store: false,
          input: [
            {
              type: file.type === 'application/pdf' ? 'document' : 'image',
              data: bytes.toString('base64'),
              mime_type: file.type,
            },
            { type: 'text', text: prompt },
          ],
          response_format: { type: 'text', mime_type: 'application/json', schema: responseSchema },
        }),
      }
    )
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ error: result?.error?.message || 'Gemini could not process this bill' }, { status: 502 })
    }

    const text = result?.output_text
      || result?.output?.find((item: { type?: string }) => item.type === 'text')?.text
      || result?.steps?.flatMap((step: { type?: string; content?: Array<{ type?: string; text?: string }> }) => step.type === 'model_output' ? step.content ?? [] : [])
        .find((item: { type?: string }) => item.type === 'text')?.text
    const parsed = geminiExtractionSchema.safeParse(typeof text === 'string' ? JSON.parse(text) : null)
    if (!parsed.success) return NextResponse.json({ error: 'Gemini returned an invalid invoice structure' }, { status: 502 })

    const { confidence, warnings } = computeConfidence(parsed.data)
    const data: OcrExtractedData = {
      ...parsed.data,
      supplier: {
        name: parsed.data.supplier.name || undefined,
        phone: parsed.data.supplier.phone || undefined,
        email: parsed.data.supplier.email || undefined,
        gstNumber: parsed.data.supplier.gstNumber || undefined,
      },
      billNumber: parsed.data.billNumber || undefined,
      billDate: parsed.data.billDate || undefined,
      items: parsed.data.items.map((item) => ({
        ...item,
        hsnCode: item.hsnCode || '',
        discountPercentage: item.discountPercentage ?? 0,
        discountAmount: item.discountAmount ?? 0,
        mrp: item.mrp ?? 0,
        mrpDiscount: item.mrpDiscount ?? 0,
        price: item.price ?? item.unitCost,
        total: item.total ?? item.qty * item.unitCost,
      })),
      subtotal: parsed.data.subtotal ?? undefined,
      taxAmount: parsed.data.taxAmount ?? undefined,
      total: parsed.data.total ?? undefined,
      rawText: JSON.stringify(parsed.data, null, 2),
      confidence,
      warnings,
    }
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Could not extract bill details. Please retry or continue with manual entry.' }, { status: 502 })
  }
}