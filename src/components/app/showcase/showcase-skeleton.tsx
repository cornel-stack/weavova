// The Showcase loading skeleton (Server, T-Showcase), used by the route's loading.tsx
// and the page's Suspense fallback. On-token, quiet — mirrors the public-style wall
// (header + a multi-column set of placeholder cards) so the loading surface is
// seamless. No content, no fabricated values.

export function ShowcaseSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-hidden>
      <div className="flex items-baseline justify-between gap-4">
        <div className="h-8 w-44 rounded-control bg-sunken" />
        <div className="h-4 w-24 rounded-pill bg-sunken" />
      </div>
      <div className="mt-2 h-4 w-72 rounded-pill bg-sunken" />

      <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mb-6 break-inside-avoid rounded-clip border border-hairline bg-card p-5 shadow-clip"
          >
            <div className="h-20 w-full rounded-control bg-sunken" />
            <div className="mt-4 h-4 w-1/2 rounded-pill bg-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
