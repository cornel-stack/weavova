// The consent loading skeleton (Server, T5-Consent), used by the route's loading.tsx
// and the page's Suspense fallback. On-token, quiet — mirrors the ledger (header + a
// set of placeholder table rows) so the loading surface is seamless. No content, no
// fabricated values.

export function ConsentSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-hidden>
      <div className="h-9 w-56 rounded-control bg-sunken" />

      <div className="mt-8 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-pill bg-sunken" />
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-clip border border-hairline bg-card shadow-clip">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-hairline px-5 py-4 last:border-b-0"
          >
            <div className="size-8 rounded-pill bg-sunken" />
            <div className="h-4 w-32 rounded-control bg-sunken" />
            <div className="ml-auto h-4 w-24 rounded-pill bg-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
