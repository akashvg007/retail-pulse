'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, Users, FileText, ShoppingCart,
  CreditCard, UserCheck, RefreshCw, BarChart2, Building2,
  ToggleLeft, Settings, LogOut, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeature } from '@/contexts/FeatureContext'
import type { Session } from 'next-auth'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  feature?: string
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

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const featureEnabled = item.feature ? useFeature(item.feature as any) : true
  if (!featureEnabled) return null

  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
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

interface SidebarProps {
  session: Session | null
}

export function Sidebar({ session }: SidebarProps) {
  const isSuperAdmin = session?.user?.role === 'super_admin'

  return (
    <aside className="flex h-full w-60 flex-col bg-slate-900">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-base font-bold text-white">RetailPulse</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {isSuperAdmin && (
          <>
            <div className="my-3 border-t border-slate-700" />
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Admin
            </p>
            {superAdminItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-slate-700 px-3 py-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <Settings size={16} />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-red-700/30 hover:text-red-300 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      {/* User info */}
      <div className="border-t border-slate-700 px-4 py-3">
        <p className="text-xs font-medium text-white truncate">{session?.user?.name}</p>
        <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
      </div>
    </aside>
  )
}
