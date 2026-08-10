export function InventorySkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-6 animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-7 w-32 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-gray-200" />
          <div className="h-8 w-28 rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-10 w-full max-w-md rounded-lg bg-gray-200" />
      <div className="h-20 w-full rounded-xl bg-gray-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 h-5 w-36 rounded bg-gray-200" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-3/4 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-12 w-full rounded-lg bg-gray-200" />
    </div>
  )
}
