export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-gray-200" />
        <div className="h-4 w-56 rounded bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-4 h-8 w-32 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-36 rounded bg-gray-200" />
          <div className="mt-4 h-52 rounded bg-gray-100" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="mt-4 h-52 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
