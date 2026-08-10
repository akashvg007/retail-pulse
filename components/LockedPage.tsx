interface LockedPageProps {
  feature: string
}

export function LockedPage({ feature }: LockedPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-gray-900">{feature} is not enabled</h2>
      <p className="text-gray-500 mt-2 max-w-sm">
        Contact your administrator to enable this feature.
      </p>
    </div>
  )
}
