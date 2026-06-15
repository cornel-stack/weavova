// Loading skeleton for the Proof inbox (T2.2). Preserves the page layout
// (sub-header / status+type chips / search / masonry Wall) using Pressroom tokens
// so the shell does not jump when content streams in. The global
// prefers-reduced-motion rule neutralises the pulse. Used by the page Suspense
// fallback and the route-segment loading.tsx.

const Block = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-clip bg-sunken ${className}`} aria-hidden />
);

export function InboxSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-busy="true">
      <span className="sr-only">Loading proof…</span>

      {/* sub-header: title + actions */}
      <div className="flex items-start justify-between gap-4">
        <Block className="h-9 w-40" />
        <Block className="h-9 w-44" />
      </div>

      {/* chips row */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Block className="h-7 w-16" />
        <Block className="h-7 w-16" />
        <Block className="h-7 w-24" />
        <Block className="ml-2 h-7 w-20" />
        <Block className="h-7 w-16" />
        <Block className="ml-auto h-7 w-36" />
      </div>

      {/* search */}
      <Block className="mt-4 h-9 w-full max-w-sm" />

      {/* count */}
      <Block className="mt-4 h-4 w-44" />

      {/* masonry Wall — varied heights so it reads as a Wall, not a grid */}
      <div className="mt-4 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {["h-64", "h-40", "h-56", "h-48", "h-60", "h-44"].map((h, i) => (
          <Block key={i} className={`mb-6 break-inside-avoid ${h}`} />
        ))}
      </div>
    </div>
  );
}
