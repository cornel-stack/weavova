// The clip-studio loading skeleton (T2.4b), used by the route's loading.tsx and the
// page's Suspense fallback. On-token, quiet — mirrors the studio's two-region layout
// (preview + configuration) so the loading surface is seamless. No content, no
// fabricated values.

export function StudioSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-hidden>
      <div className="h-4 w-16 rounded-pill bg-sunken" />
      <div className="mt-3 h-8 w-56 rounded-control bg-sunken" />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* preview region */}
        <div className="aspect-[4/5] rounded-clip border border-hairline bg-sunken shadow-clip" />

        {/* configuration region */}
        <div className="flex flex-col gap-6">
          <div className="h-4 w-24 rounded-pill bg-sunken" />
          <div className="flex gap-2">
            <div className="h-9 w-16 rounded-control bg-sunken" />
            <div className="h-9 w-16 rounded-control bg-sunken" />
            <div className="h-9 w-16 rounded-control bg-sunken" />
            <div className="h-9 w-16 rounded-control bg-sunken" />
          </div>
          <div className="h-4 w-20 rounded-pill bg-sunken" />
          <div className="h-24 w-full rounded-control bg-sunken" />
          <div className="h-11 w-36 rounded-control bg-sunken" />
        </div>
      </div>
    </div>
  );
}
