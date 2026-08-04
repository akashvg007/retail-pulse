'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, Users, FileText, ShoppingCart,
  CreditCard, UserCheck, RefreshCw, BarChart2, Building2,
  ToggleLeft, Settings, LogOut, Zap, Menu, X,
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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, feature: 'inventory' },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, feature: 'crm' },
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

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const featureFlag = useFeature(item.feature)
  const featureEnabled = !item.feature || featureFlag
  if (!featureEnabled) return null

  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      )}
    >
      <item.icon size={16} />
      {item.label}
    </Link>
  )
}

function Brand() {
  return (
    <>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
        <Zap size={16} className="text-white" />
      </div>
      <span className="text-base font-bold text-white">RetailPulse</span>
    </>
  )
}

function SidebarContent({ session, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const isSuperAdmin = session?.user?.role === 'super_admin'

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-slate-700 px-5 py-5">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}

        {isSuperAdmin && (
          <>
            <div className="my-3 border-t border-slate-700" />
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Admin
            </p>
            {superAdminItems.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>

      <div className="space-y-1 border-t border-slate-700 px-3 py-4">
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <Settings size={16} />
          Settings
        </Link>
        <button
          onClick={() => {
            onNavigate?.()
            signOut({ callbackUrl: '/login' })
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-700/30 hover:text-red-300"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      <div className="border-t border-slate-700 px-4 py-3">
        <p className="truncate text-xs font-medium text-white">{session?.user?.name}</p>
        <p className="truncate text-xs text-slate-400">{session?.user?.email}</p>
      </div>
    </>
  )
}

interface SidebarProps {
  session: Session | null
}

export function Sidebar({ session }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

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

      <aside className="hidden h-screen w-60 flex-col bg-slate-900 lg:flex">
        <SidebarContent session={session} />
      </aside>
    </>
  )
}
