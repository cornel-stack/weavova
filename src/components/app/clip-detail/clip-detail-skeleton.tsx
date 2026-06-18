// The clip-detail loading skeleton (Server, T3.2), used by the route's loading.tsx
// and the page's Suspense fallback. On-token, quiet — mirrors the two-column layout
// (sample-still + hook | provenance + actions) so the loading surface is seamless.

export function ClipDetailSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-hidden>
      <div className="h-4 w-16 rounded-pill bg-sunken" />
      <div className="mt-3 h-8 w-56 rounded-control bg-sunken" />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* content — the clip still */}
        <div className="space-y-6 lg:col-span-2">
          <div className="mx-auto aspect-[4/5] w-full max-w-sm rounded-clip border border-hairline bg-sunken shadow-clip" />
          <div className="h-24 w-full rounded-clip border border-hairline bg-card shadow-clip" />
        </div>

        {/* side panel */}
        <div className="flex flex-col gap-6">
          <div className="h-36 rounded-clip border border-hairline bg-card shadow-clip" />
          <div className="h-28 rounded-clip border border-hairline bg-card shadow-clip" />
          <div className="h-11 w-40 rounded-control bg-sunken" />
        </div>
      </div>
    </div>
  );
}
