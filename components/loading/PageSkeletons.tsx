import { Skeleton, SkeletonTableRows } from '@/components/ui/Skeleton'

function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-7 w-36" />
      {action && <Skeleton className="h-9 w-28" />}
    </div>
  )
}

export function DashboardRouteSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex animate-pulse">
      <div className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block" />
      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <div className="space-y-5">
          <Skeleton className="h-8 w-44" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl bg-white" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Skeleton className="h-64 rounded-xl bg-white" />
            <Skeleton className="h-64 rounded-xl bg-white" />
          </div>
        </div>
      </main>
    </div>
  )
}

export function TablePageSkeleton({ columns = 5, action = true, filters = false }: { columns?: number; action?: boolean; filters?: boolean }) {
  return (
    <div className="space-y-4 p-4 sm:p-6 animate-pulse">
      <PageHeaderSkeleton action={action} />
      {filters && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-2 gap-4 border-b bg-gray-50 px-4 py-3 sm:grid-cols-5">
          {Array.from({ length: Math.min(columns, 5) }).map((_, index) => <Skeleton key={index} className="h-3 w-20" />)}
        </div>
        <table className="w-full"><tbody><SkeletonTableRows columns={columns} rows={6} /></tbody></table>
      </div>
    </div>
  )
}

export function FeaturePageSkeleton() {
  return (
    <div className="space-y-5 p-4 sm:p-6 animate-pulse">
      <PageHeaderSkeleton action={false} />
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
            <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-56" /></div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-5 p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between"><Skeleton className="h-8 w-24" /><Skeleton className="h-9 w-28" /></div>
      <div className="rounded-xl border border-gray-200 bg-white p-5"><Skeleton className="h-7 w-52" /><Skeleton className="mt-3 h-4 w-72" /></div>
      <div className="grid gap-5 lg:grid-cols-3"><Skeleton className="h-40 rounded-xl bg-white lg:col-span-1" /><Skeleton className="h-80 rounded-xl bg-white lg:col-span-2" /></div>
    </div>
  )
}

export function PosPageSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-1px)] flex-col gap-4 bg-slate-50 p-4 animate-pulse xl:flex-row sm:p-6">
      <section className="min-w-0 flex-1 space-y-5"><PageHeaderSkeleton action={false} /><Skeleton className="h-10 w-full max-w-xl" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl bg-white" />)}</div></section>
      <aside className="hidden w-full rounded-xl border border-gray-200 bg-white p-5 xl:block xl:max-w-sm"><Skeleton className="h-6 w-32" /><div className="mt-6 space-y-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div></aside>
    </div>
  )
}

export function ReportsPageSkeleton() {
  return (
    <div className="space-y-5 p-4 sm:p-6 animate-pulse"><PageHeaderSkeleton action={false} /><Skeleton className="h-10 w-full max-w-md" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl bg-white" />)}</div><div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-72 rounded-xl bg-white" /><Skeleton className="h-72 rounded-xl bg-white" /></div><Skeleton className="h-56 rounded-xl bg-white" /></div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-5 p-4 sm:p-6 animate-pulse"><PageHeaderSkeleton action={false} /><div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-5"><Skeleton className="h-5 w-48" /><div className="mt-6 grid gap-4 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div><Skeleton className="mt-6 h-10 w-24" /></div></div>
  )
}

export function AuthPageSkeleton() {
  return <div className="flex min-h-screen items-center justify-center p-6 animate-pulse"><div className="w-full max-w-md space-y-5"><Skeleton className="mx-auto h-8 w-40" /><Skeleton className="h-72 w-full rounded-xl" /></div></div>
}