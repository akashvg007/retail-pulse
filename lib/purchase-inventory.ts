import mongoose from 'mongoose'
import { Product } from '@/models/Product'
import type { PurchaseOrderItem } from '@/models/PurchaseOrder'

export type InventoryPostEntry = {
  productId: string | null
  name: string
  sku: string | null
  qtyAdded: number
  unitCost: number
  price: number
  mrp: number
  taxRate: number
  hsnCode: string
}

type PurchaseItemLike = {
  productId?: mongoose.Types.ObjectId | string
  name: string
  hsnCode?: string
  qty: number
  receivedQty?: number
  unitCost: number
  price: number
  mrp: number
  taxRate: number
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function generateSku(name: string, index: number) {
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 6) || 'ITEM'
  const suffix = String(Date.now() + index).slice(-6)
  return `${base}-${suffix}`
}

function toIdString(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && typeof (value as { toString?: unknown }).toString === 'function') {
    return (value as { toString: () => string }).toString()
  }
  return null
}

function pricingFields(item: PurchaseItemLike) {
  return {
    cost: Number(item.unitCost || 0),
    price: Number(item.price || item.unitCost || 0),
    mrp: Number(item.mrp || 0),
    taxRate: Number(item.taxRate || 0),
    gstRate: Number(item.taxRate || 0),
    hsnCode: item.hsnCode || '',
  }
}

export function legacyInventoryEntriesFromItems(items: PurchaseItemLike[]): InventoryPostEntry[] {
  return items.map((item) => ({
    productId: toIdString(item.productId),
    name: item.name,
    sku: null,
    qtyAdded: Math.max(0, Number(item.receivedQty || item.qty || 0)),
    unitCost: Number(item.unitCost || 0),
    price: Number(item.price || 0),
    mrp: Number(item.mrp || 0),
    taxRate: Number(item.taxRate || 0),
    hsnCode: item.hsnCode || '',
  }))
}

export function normalizeInventoryPostSummary(
  summary: Array<Partial<InventoryPostEntry> & { productId?: unknown; name?: string; qtyAdded?: number }> | undefined,
  items: PurchaseItemLike[]
): InventoryPostEntry[] {
  if (Array.isArray(summary) && summary.length > 0) {
    return summary.map((entry, index) => {
      const fallback = items[index]
      return {
        productId: toIdString(entry.productId) ?? toIdString(fallback?.productId) ?? null,
        name: entry.name || fallback?.name || 'Item',
        sku: entry.sku ?? null,
        qtyAdded: Math.max(0, Number(entry.qtyAdded ?? fallback?.receivedQty ?? fallback?.qty ?? 0)),
        unitCost: Number(entry.unitCost ?? fallback?.unitCost ?? 0),
        price: Number(entry.price ?? fallback?.price ?? 0),
        mrp: Number(entry.mrp ?? fallback?.mrp ?? 0),
        taxRate: Number(entry.taxRate ?? fallback?.taxRate ?? 0),
        hsnCode: entry.hsnCode ?? fallback?.hsnCode ?? '',
      }
    })
  }
  return legacyInventoryEntriesFromItems(items)
}

async function findProductForItem(
  tenantId: string,
  item: PurchaseItemLike
) {
  if (item.productId) {
    const byId = await Product.findOne({
      _id: item.productId,
      tenantId,
      active: true,
    })
    if (byId) return byId
  }

  return Product.findOne({
    tenantId,
    active: true,
    name: { $regex: `^${escapeRegex(item.name)}$`, $options: 'i' },
  })
}

export async function postPurchaseItemsToInventory(options: {
  tenantId: string
  poNo: string
  items: PurchaseItemLike[]
}): Promise<InventoryPostEntry[]> {
  const { tenantId, poNo, items } = options
  const summaries: InventoryPostEntry[] = []
  const createdProductIds: string[] = []
  const stockIncrements: Array<{ productId: string; qty: number }> = []

  try {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const qtyToAdd = Math.max(0, Number(item.receivedQty || item.qty || 0))
      if (qtyToAdd <= 0) {
        summaries.push({
          productId: toIdString(item.productId),
          name: item.name,
          sku: null,
          qtyAdded: 0,
          unitCost: Number(item.unitCost || 0),
          price: Number(item.price || 0),
          mrp: Number(item.mrp || 0),
          taxRate: Number(item.taxRate || 0),
          hsnCode: item.hsnCode || '',
        })
        continue
      }

      let product = await findProductForItem(tenantId, item)
      const pricing = pricingFields(item)

      if (product) {
        await Product.updateOne(
          { _id: product._id, tenantId },
          {
            $inc: { stockQty: qtyToAdd },
            $set: pricing,
          }
        )
        stockIncrements.push({ productId: product._id.toString(), qty: qtyToAdd })
      } else {
        product = await Product.create({
          tenantId,
          name: item.name,
          sku: generateSku(item.name, index),
          description: `Auto-created from ${poNo}`,
          ...pricing,
          category: 'Purchased',
          stockQty: qtyToAdd,
          active: true,
        })
        createdProductIds.push(product._id.toString())
      }

      summaries.push({
        productId: product._id.toString(),
        name: item.name,
        sku: product.sku,
        qtyAdded: qtyToAdd,
        unitCost: pricing.cost,
        price: pricing.price,
        mrp: pricing.mrp,
        taxRate: pricing.taxRate,
        hsnCode: pricing.hsnCode,
      })
    }

    return summaries
  } catch (error) {
    await Promise.all([
      ...stockIncrements.map(({ productId, qty }) =>
        Product.updateOne({ _id: productId, tenantId }, { $inc: { stockQty: -qty } })
      ),
      ...createdProductIds.map((productId) => Product.deleteOne({ _id: productId, tenantId })),
    ])
    throw error
  }
}

export async function reverseInventoryPostEntries(options: {
  tenantId: string
  entries: InventoryPostEntry[]
}) {
  const { tenantId, entries } = options
  const reversed: Array<{ productId: string; qty: number }> = []

  try {
    for (const entry of entries) {
      const qty = Math.max(0, Number(entry.qtyAdded || 0))
      if (!entry.productId || qty <= 0) continue

      const updated = await Product.findOneAndUpdate(
        {
          _id: entry.productId,
          tenantId,
          stockQty: { $gte: qty },
        },
        { $inc: { stockQty: -qty } },
        { new: true }
      )

      if (!updated) {
        const product = await Product.findOne({ _id: entry.productId, tenantId }).lean()
        const available = Number(product?.stockQty ?? 0)
        throw new Error(
          `Cannot reconcile inventory for "${entry.name}". Available stock: ${available}, required to reverse: ${qty}`
        )
      }

      reversed.push({ productId: entry.productId, qty })
    }
  } catch (error) {
    if (reversed.length > 0) {
      await Promise.all(
        reversed.map(({ productId, qty }) =>
          Product.updateOne({ _id: productId, tenantId }, { $inc: { stockQty: qty } })
        )
      )
    }
    throw error
  }

  return reversed
}

export async function reconcilePostedPurchaseInventory(options: {
  tenantId: string
  poNo: string
  previousEntries: InventoryPostEntry[]
  nextItems: PurchaseItemLike[]
}): Promise<InventoryPostEntry[]> {
  const { tenantId, poNo, previousEntries, nextItems } = options
  await reverseInventoryPostEntries({ tenantId, entries: previousEntries })

  try {
    return await postPurchaseItemsToInventory({ tenantId, poNo, items: nextItems })
  } catch (error) {
    // Best-effort restore of previous stock if re-post fails after reverse.
    try {
      await postPurchaseItemsToInventory({
        tenantId,
        poNo,
        items: previousEntries.map((entry) => ({
          productId: entry.productId || undefined,
          name: entry.name,
          hsnCode: entry.hsnCode,
          qty: entry.qtyAdded,
          receivedQty: entry.qtyAdded,
          unitCost: entry.unitCost,
          price: entry.price,
          mrp: entry.mrp,
          taxRate: entry.taxRate,
        })),
      })
    } catch {
      // Preserve original error; restore may also fail if products were deleted.
    }
    throw error
  }
}

export function withReceivedQuantities(
  items: Array<NormalizedLineForReceive>,
  status: string,
  previousItems: PurchaseOrderItem[] = []
) {
  if (status === 'received') {
    return items.map((item) => ({ ...item, receivedQty: item.qty, returnedQty: 0 }))
  }

  if (status === 'partially_received') {
    return items.map((item, index) => {
      const previous = previousItems[index]
      const previousReceived = Number(previous?.receivedQty ?? 0)
      return {
        ...item,
        receivedQty: Math.min(item.qty, previousReceived),
        returnedQty: Number(previous?.returnedQty ?? 0),
      }
    })
  }

  return items.map((item, index) => ({
    ...item,
    receivedQty: Number(previousItems[index]?.receivedQty ?? 0),
    returnedQty: Number(previousItems[index]?.returnedQty ?? 0),
  }))
}

type NormalizedLineForReceive = {
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
