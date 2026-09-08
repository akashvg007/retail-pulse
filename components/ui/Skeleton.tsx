import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded bg-gray-200', className)} {...props} />
}

export function SkeletonTableRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <td key={columnIndex} className="px-4 py-3">
              <Skeleton className={columnIndex === 0 ? 'h-4 w-32' : 'h-4 w-20'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}