/**
 * Invoice Branding Integration Helper
 * 
 * Use these functions to incorporate tenant branding when generating or displaying invoices.
 * 
 * Example usage in API route:
 * ```ts
 * const tenant = await Tenant.findById(invoiceData.tenantId)
 * const invoiceWithBranding = buildInvoiceWithBranding(invoice, tenant)
 * ```
 * 
 * Example usage in React component:
 * ```tsx
 * const invoice = await fetchInvoice(id)
 * const tenant = await fetchTenantSettings()
 * return <InvoicePrintTemplate invoice={invoice} tenant={tenant} />
 * ```
 */

import { ITenant } from '@/models/Tenant'
import { IInvoice } from '@/models/Invoice'

export interface InvoiceWithBranding extends IInvoice {
  tenantBranding?: {
    businessLogo?: string
    primaryColor?: string
    secondaryColor?: string
    tagline?: string
    paymentTerms?: string
    invoiceFooter?: string
    phone?: string
    email?: string
    address?: string
    gstNumber?: string
    name?: string
  }
}

/**
 * Enrich invoice data with tenant branding information
 * @param invoice - The invoice document
 * @param tenant - The tenant document with settings
 * @returns Invoice with embedded branding data
 */
export function buildInvoiceWithBranding(invoice: IInvoice, tenant: ITenant): InvoiceWithBranding {
  return {
    ...invoice.toObject?.() ?? invoice,
    tenantBranding: {
      businessLogo: tenant.settings?.branding?.businessLogo || tenant.settings?.logo,
      primaryColor: tenant.settings?.branding?.primaryColor,
      secondaryColor: tenant.settings?.branding?.secondaryColor,
      tagline: tenant.settings?.branding?.tagline,
      paymentTerms: tenant.settings?.branding?.paymentTerms,
      invoiceFooter: tenant.settings?.branding?.invoiceFooter,
      phone: tenant.settings?.branding?.phone,
      email: tenant.settings?.branding?.email,
      address: tenant.settings?.address,
      gstNumber: tenant.settings?.gstNumber,
      name: tenant.name,
    },
  }
}

/**
 * CSS class builder for invoice branding
 * Use primary and secondary colors to style invoice templates
 */
export function getBrandingStyles(
  primaryColor?: string,
  secondaryColor?: string
): { primary: string; secondary: string } {
  return {
    primary: primaryColor || '#000000',
    secondary: secondaryColor || '#666666',
  }
}

/**
 * Format invoice header with branding
 * Returns HTML/JSX compatible markup for invoice header
 */
export function formatInvoiceHeader(branding?: InvoiceWithBranding['tenantBranding']): string {
  if (!branding) return ''

  return `
    <div style="margin-bottom: 2rem;">
      ${branding.businessLogo ? `<img src="${branding.businessLogo}" alt="Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 1rem;" />` : ''}
      ${branding.name ? `<h1 style="margin: 0; font-size: 24px; color: ${branding.primaryColor || '#000000'}">${branding.name}</h1>` : ''}
      ${branding.tagline ? `<p style="margin: 0.5rem 0; color: ${branding.secondaryColor || '#666666'}">${branding.tagline}</p>` : ''}
    </div>
  `
}

/**
 * Format invoice footer with branding
 */
export function formatInvoiceFooter(branding?: InvoiceWithBranding['tenantBranding']): string {
  if (!branding) return ''

  const parts: string[] = []

  if (branding.address) {
    parts.push(`<div>${branding.address}</div>`)
  }

  if (branding.phone || branding.email) {
    const contact = [branding.phone, branding.email].filter(Boolean).join(' | ')
    parts.push(`<div>${contact}</div>`)
  }

  if (branding.gstNumber) {
    parts.push(`<div>GST: ${branding.gstNumber}</div>`)
  }

  if (branding.paymentTerms) {
    parts.push(`<div style="margin-top: 1rem; font-weight: bold;">Payment Terms: ${branding.paymentTerms}</div>`)
  }

  if (branding.invoiceFooter) {
    parts.push(`<div style="margin-top: 1rem; border-top: 1px solid #ddd; padding-top: 1rem;">${branding.invoiceFooter}</div>`)
  }

  return parts.length > 0 ? `<div style="font-size: 12px; color: #666; margin-top: 2rem;">${parts.join('')}</div>` : ''
}
