// Loading skeleton for the dashboard (T2.1). Preserves the page layout
// (masthead / KPI strip / hero / recent grid) using Pressroom tokens so the
// shell does not jump when content streams in. The global prefers-reduced-motion
// rule neutralises the pulse. Used by the page Suspense fallback and loading.tsx.

const Block = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-clip bg-sunken ${className}`} aria-hidden />
);

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-busy="true">
      <span className="sr-only">Loading dashboard…</span>

      {/* masthead: greeting + request action */}
      <div className="flex items-start justify-between gap-4">
        <Block className="h-9 w-80 max-w-[60%]" />
        <Block className="h-9 w-32" />
      </div>

      {/* KPI strip */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Block className="h-20" />
        <Block className="h-20" />
        <Block className="h-20" />
        <Block className="h-20" />
      </div>

      {/* hero */}
      <Block className="mt-10 h-56" />

      {/* recent grid */}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        <Block className="h-64" />
        <Block className="h-64" />
        <Block className="h-64" />
      </div>
    </div>
  );
}
