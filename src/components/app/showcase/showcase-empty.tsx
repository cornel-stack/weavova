import { LayoutGrid } from "lucide-react";
import Link from "next/link";

// The honest Showcase empty state (Server, T-Showcase). Shown by ShowcaseData when
// there are no consented items to show — covering BOTH "nothing eligible yet" AND
// "all currently withheld" IDENTICALLY (no fabricated rows/counts, no oracle that
// would leak withheld items exist — P-VII + FR-019). Orients toward capturing proof:
// the wall fills from consented proof + clips, so the one honest affordance is a link
// to the proof inbox.

export function ShowcaseEmpty() {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="font-display text-display-lg text-ink">Showcase</h1>

      <div className="mt-10 flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-20 text-center shadow-clip">
        <span className="flex size-12 items-center justify-center rounded-control bg-sunken text-ink-2">
          <LayoutGrid className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-display-sm text-ink">
          Nothing on the wall yet.
        </h2>
        <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
          Your showcase fills with consented proof and the clips you make from it.
          Capture some proof to start building the wall.
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
