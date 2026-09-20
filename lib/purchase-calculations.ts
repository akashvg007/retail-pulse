export type PurchaseLineInput = {
  productId?: string
  name: string
  hsnCode?: string
  qty: number
  unitCost: number
  discountPercentage?: number
  discountAmount?: number
  mrp?: number
  mrpDiscount?: number
  price?: number
  taxRate?: number
}

export type NormalizedPurchaseLine = {
  productId?: string
  name: string
  hsnCode: string
  qty: number
  unitCost: number
  discountPercentage: number
  discountAmount: number
  mrp: number
  mrpDiscount: number
  price: number
  taxRate: number
  total: number
}

export function computeLineTotal(
  qty: number,
  unitCost: number,
  discountAmount: number,
  taxRate: number
) {
  const base = Math.max(0, qty * unitCost - discountAmount)
  return base + (base * taxRate) / 100
}

export function normalizePurchaseLine(item: PurchaseLineInput): NormalizedPurchaseLine {
  const qty = Number(item.qty) || 0
  const unitCost = Number(item.unitCost) || 0
  const taxRate = Number(item.taxRate) || 0
  const lineValue = qty * unitCost
  const discountAmount =
    Number(item.discountAmount) || (lineValue * (Number(item.discountPercentage) || 0)) / 100
  const discountPercentage = lineValue > 0 ? (discountAmount / lineValue) * 100 : 0
  const total = computeLineTotal(qty, unitCost, discountAmount, taxRate)

  return {
    productId: item.productId || undefined,
    name: item.name,
    hsnCode: item.hsnCode?.trim() || '',
    qty,
    unitCost,
    discountPercentage,
    discountAmount,
    mrp: Number(item.mrp) || 0,
    mrpDiscount: Number(item.mrpDiscount) || 0,
    price: Number(item.price) || 0,
    taxRate,
    total,
  }
}

export function computePurchaseTotals(
  items: Array<Pick<NormalizedPurchaseLine, 'qty' | 'unitCost' | 'discountAmount' | 'total' | 'price'>>,
  roundingAdjustment = 0
) {
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.qty * item.unitCost - item.discountAmount),
    0
  )
  const calculatedTotal = items.reduce((sum, item) => sum + item.total, 0)
  const total = Math.max(0, calculatedTotal + roundingAdjustment)
  const taxAmount = Math.max(0, calculatedTotal - subtotal)
  const sellingPriceTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return {
    subtotal,
    taxAmount,
    total,
    sellingPriceTotal,
    roundingAdjustment,
  }
}
