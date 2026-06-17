import { Film } from "lucide-react";
import Link from "next/link";

// The honest Library empty state (Server, T3.1). Shown by LibraryData when the
// workspace has no consent-visible clips — covering BOTH "none generated yet" AND
// "all currently withheld" IDENTICALLY (no fabricated rows/counts, no existence
// oracle that would leak that withheld clips exist — P-VII + FR-019). Orients the
// merchant toward making one: clips are made from a granted proof's "Make a clip",
// so the one honest affordance is a link to the proof inbox (which exists).

export function LibraryEmpty() {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="font-display text-display-lg text-ink">Library</h1>

      <div className="mt-10 flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-20 text-center shadow-clip">
        <span className="flex size-12 items-center justify-center rounded-control bg-sunken text-ink-2">
          <Film className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-display-sm text-ink">
          No clips yet.
        </h2>
        <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
          Clips you make from a consented proof land here. Open a proof and use
          &ldquo;Make a clip&rdquo; to create your first.
        </p>
        <Link
          href="/app/proof"
          className="mt-6 inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Browse proof
        </Link>
      </div>
    </div>
  );
}
