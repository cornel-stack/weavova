// The brand-kit loading skeleton (Server, T5-BrandKit), used by the route's loading.tsx
// and the page's Suspense fallback. On-token, quiet — mirrors the editor + preview
// columns. No content, no fabricated values.

export function BrandKitSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-hidden>
      <div className="h-9 w-44 rounded-control bg-sunken" />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="h-32 w-full rounded-clip bg-sunken" />
          <div className="h-10 w-full rounded-control bg-sunken" />
          <div className="h-10 w-full rounded-control bg-sunken" />
        </div>
        <div className="h-72 w-full rounded-clip bg-sunken" />
      </div>
    </div>
  );
}
