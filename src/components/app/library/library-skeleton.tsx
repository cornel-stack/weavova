// The Library loading skeleton (Server, T3.1), used by the route's loading.tsx and
// the page's Suspense fallback. On-token, quiet — mirrors the grid (header + a
// multi-column set of placeholder clip cards) so the loading surface is seamless.
// No content, no fabricated values.

export function LibrarySkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-hidden>
      <div className="flex items-baseline justify-between gap-4">
        <div className="h-8 w-40 rounded-control bg-sunken" />
        <div className="h-4 w-16 rounded-pill bg-sunken" />
      </div>

      <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mb-6 break-inside-avoid rounded-clip border border-hairline bg-card shadow-clip"
          >
            <div className="aspect-[4/5] rounded-t-clip bg-sunken" />
            <div className="flex flex-col gap-2 p-5">
              <div className="h-5 w-3/4 rounded-control bg-sunken" />
              <div className="h-4 w-1/2 rounded-pill bg-sunken" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
