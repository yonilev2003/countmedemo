// Global loading skeleton for any page inside (app).
// Shown while Server Components on the next route fetch their data.

export default function AppLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="space-y-4 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-surface-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-surface-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white border border-surface-200 p-4">
              <div className="h-3 w-16 bg-surface-100 rounded animate-pulse" />
              <div className="h-8 w-12 bg-surface-100 rounded animate-pulse mt-3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white border border-surface-200 p-4">
              <div className="h-4 w-24 bg-surface-100 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-10 bg-surface-50 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
