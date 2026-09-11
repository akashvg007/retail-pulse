import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, requireFeature } from '@/lib/tenant'
import { Customer } from '@/models/Customer'
import { Invoice } from '@/models/Invoice'
import { deductInventoryForInvoiceSale } from '@/lib/inventory-sale'

function withBusinessName<T extends { tenantId?: unknown }>(invoice: T) {
  const tenant = (
    invoice &&
    typeof invoice.tenantId === 'object' &&
    invoice.tenantId !== null
      ? invoice.tenantId
      : null
  ) as {
      name?: string
      settings?: {
        logo?: string
        address?: string
        gstNumber?: string
        branding?: {
          businessLogo?: string
          phone?: string
          email?: string
          paymentTerms?: string
          invoiceFooter?: string
        }
        invoiceDisplay?: Record<string, boolean>
      }
    } | null

  const settings = tenant?.settings

  return {
    ...invoice,
    businessName: tenant?.name,
    tenantBranding: {
      name: tenant?.name,
      businessLogo: settings?.branding?.businessLogo || settings?.logo,
      address: settings?.address,
      gstNumber: settings?.gstNumber,
      phone: settings?.branding?.phone,
      email: settings?.branding?.email,
      paymentTerms: settings?.branding?.paymentTerms,
      invoiceFooter: settings?.branding?.invoiceFooter,
      invoiceDisplay: settings?.invoiceDisplay,
    },
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  const invoice = await Invoice.findOne({ _id: id, tenantId: ctx.tenantId })
    .populate('customerId', 'name email phone gstNumber')
    .populate('tenantId', 'name settings')
    .lean()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: withBusinessName(invoice) })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  const body = await req.json()
  await connectDB()
  const { id } = await params

  const existingInvoice = await Invoice.findOne({ _id: id, tenantId: ctx.tenantId }).lean()
  if (!existingInvoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const update: Record<string, unknown> = { ...body }
  if (Object.prototype.hasOwnProperty.call(body, 'customerId')) {
    const customerId = body.customerId === '' ? undefined : body.customerId
    update.customerId = customerId

    if (customerId) {
      const customer = await Customer.findOne({ _id: customerId, tenantId: ctx.tenantId }).lean()
      update.customerSnapshot = customer
        ? {
            name: customer.name,
            email: customer.email,
            gstNumber: customer.gstNumber,
          }
        : undefined
    } else {
      update.customerSnapshot = undefined
    }
  }

  const nextStatus = typeof update.status === 'string' ? update.status : undefined
  const movedToSoldStatus =
    (nextStatus === 'sent' || nextStatus === 'paid') &&
    existingInvoice.status !== 'sent' &&
    existingInvoice.status !== 'paid'

  if (movedToSoldStatus) {
    try {
      await deductInventoryForInvoiceSale({
        invoiceId: id,
        tenantId: String(ctx.tenantId),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update inventory for this sale'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, tenantId: ctx.tenantId },
    update,
    { new: true }
  )
    .populate('customerId', 'name email phone gstNumber')
    .populate('tenantId', 'name settings')
    .lean()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: withBusinessName(invoice) })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth()
  if (ctx instanceof NextResponse) return ctx
  const denied = await requireFeature(ctx, 'invoicing')
  if (denied) return denied

  await connectDB()
  const { id } = await params
  await Invoice.findOneAndDelete(
    { _id: id, tenantId: ctx.tenantId }
  )
  return NextResponse.json({ success: true })
}
