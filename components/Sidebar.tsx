'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, Users, FileText, ShoppingCart,
  CreditCard, UserCheck, RefreshCw, BarChart2, Building2,
  ToggleLeft, Settings, LogOut, Zap, Menu, X, Truck, ClipboardList,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeature } from '@/contexts/FeatureContext'
import type { Session } from 'next-auth'
import type { FeatureKey } from '@/types/features'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  feature?: FeatureKey
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, feature: 'inventory' },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, feature: 'crm' },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: Truck, feature: 'supplier_management' },
  { href: '/dashboard/purchases', label: 'Purchases', icon: ClipboardList, feature: 'purchase_management' },
  { href: '/dashboard/invoices', label: 'Invoices', icon: FileText, feature: 'invoicing' },
  { href: '/dashboard/pos', label: 'Point of Sale', icon: ShoppingCart, feature: 'pos' },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, feature: 'payments' },
  { href: '/dashboard/staff', label: 'Staff', icon: UserCheck, feature: 'staff_management' },
  { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: RefreshCw, feature: 'subscriptions' },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart2, feature: 'reports' },
]

const superAdminItems: NavItem[] = [
  { href: '/dashboard/tenants', label: 'Tenants', icon: Building2, superAdminOnly: true },
  { href: '/dashboard/features', label: 'Feature Flags', icon: ToggleLeft, superAdminOnly: true },
]

function NavLink({ item, onNavigate, collapsed = false }: { item: NavItem; onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname()
  const featureFlag = useFeature(item.feature)
  const featureEnabled = !item.feature || featureFlag
  if (!featureEnabled) return null

  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      className={cn(
        'flex items-center rounded-lg py-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2' : 'gap-3 px-3',
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      )}
    >
      <item.icon size={18} />
      {!collapsed ? item.label : null}
    </Link>
  )
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
        <Zap size={16} className="text-white" />
      </div>
      {!collapsed ? <span className="text-base font-bold text-white">RetailPulse</span> : null}
    </>
  )
}

function SidebarContent({
  session,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps & { onNavigate?: () => void; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const isSuperAdmin = session?.user?.role === 'super_admin'
  const hasDashboardAccess = useFeature('dashboard') || isSuperAdmin

  return (
    <>
      <div className={cn('flex items-center border-b border-slate-700 py-5', collapsed ? 'justify-center px-2' : 'gap-2.5 px-5')}>
        <Brand collapsed={collapsed} />
      </div>

      <nav className={cn('flex-1 space-y-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {hasDashboardAccess && <NavLink key="/dashboard" item={navItems[0]} onNavigate={onNavigate} collapsed={collapsed} />}
        {navItems.slice(1).map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} collapsed={collapsed} />
        ))}

        {isSuperAdmin && (
          <>
            <div className="my-3 border-t border-slate-700" />
            {!collapsed ? <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Admin</p> : null}
            {superAdminItems.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={onNavigate} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      <div className={cn('space-y-1 border-t border-slate-700 py-4', collapsed ? 'px-2' : 'px-3')}>
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          title={collapsed ? 'Settings' : undefined}
          aria-label="Settings"
          className={cn('flex items-center rounded-lg py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white', collapsed ? 'justify-center px-2' : 'gap-3 px-3')}
        >
          <Settings size={18} />
          {!collapsed ? 'Settings' : null}
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onNavigate?.()
              signOut({ callbackUrl: '/login' })
            }}
            title={collapsed ? 'Sign out' : undefined}
            aria-label={`Sign out${!collapsed && session?.user?.name ? ` (${session.user.name})` : ''}`}
            className={cn('flex min-w-0 flex-1 items-center rounded-lg py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-700/30 hover:text-red-300', collapsed ? 'justify-center px-0.5' : 'gap-3 px-3')}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed ? <span className="truncate">{`Sign out${session?.user?.name ? ` (${session.user.name})` : ''}`}</span> : null}
          </button>
          {onToggleCollapse && !collapsed ? (
            <button
              type="button"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              onClick={onToggleCollapse}
              className="shrink-0 rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}
        </div>
      </div>
      {onToggleCollapse && collapsed ? (
        <div className="flex justify-center border-t border-slate-700 p-2">
          <button
            type="button"
            aria-label="Expand sidebar"
            title="Expand sidebar"
            onClick={onToggleCollapse}
            className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : null}
    </>
  )
}

interface SidebarProps {
  session: Session | null
}

export function Sidebar({ session }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2 text-slate-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold">RetailPulse</span>
        </div>
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-slate-900 transition-transform lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent session={session} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <aside className={cn('hidden h-screen flex-col bg-slate-900 transition-[width] duration-200 lg:flex', collapsed ? 'w-16' : 'w-60')}>
        <SidebarContent
          session={session}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </aside>
    </>
  )
}
