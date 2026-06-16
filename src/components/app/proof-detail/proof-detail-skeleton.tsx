// Loading skeleton for the Proof detail (T2.3). Preserves the screen-03 layout
// (back link / title / two-column: content + side panel) using Pressroom tokens so
// the shell does not jump when content streams in. The global prefers-reduced-motion
// rule neutralises the pulse. Used by the page Suspense fallback and loading.tsx.

const Block = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-clip bg-sunken ${className}`} aria-hidden />
);

export function ProofDetailSkeleton() {
  return (
    <div className="mx-auto max-w-content px-6 py-10" aria-busy="true">
      <span className="sr-only">Loading proof…</span>

      {/* back link + title */}
      <Block className="h-5 w-20" />
      <Block className="mt-4 h-9 w-56" />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* content column */}
        <div className="space-y-4 lg:col-span-2">
          <Block className="h-7 w-full" />
          <Block className="h-7 w-11/12" />
          <Block className="h-7 w-4/5" />
        </div>

        {/* side panel */}
        <div className="space-y-6">
          <Block className="h-36" />
          <Block className="h-24" />
          <Block className="h-11 w-40" />
        </div>
      </div>
    </div>
  );
}
