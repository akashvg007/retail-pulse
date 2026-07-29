import { cn, formatCurrency } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  isCurrency?: boolean
  change?: number
  icon: LucideIcon
  iconColor?: string
  className?: string
}

export function KPICard({
  title,
  value,
  isCurrency = false,
  change,
  icon: Icon,
  iconColor = 'text-indigo-600',
  className,
}: KPICardProps) {
  const display = isCurrency && typeof value === 'number' ? formatCurrency(value) : value

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{display}</p>
          {change !== undefined && (
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                change >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last month
            </p>
          )}
        </div>
        <div className={cn('rounded-lg bg-gray-50 p-2.5', iconColor)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
