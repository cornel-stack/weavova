// The footage-store loading skeleton (Server, T4-B2), used by the route's
// loading.tsx and the page's Suspense fallback. On-token, quiet — mirrors the store
// layout (header + the upload panel + a column of placeholder asset rows) so the
// loading surface is seamless. No content, no fabricated values.

export function FootageSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-hidden>
      <div className="flex items-baseline justify-between gap-4">
        <div className="h-9 w-48 rounded-control bg-sunken" />
        <div className="h-4 w-16 rounded-pill bg-sunken" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="h-72 rounded-clip border border-hairline bg-card shadow-clip lg:col-span-1" />
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-clip border border-hairline bg-card shadow-clip"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
