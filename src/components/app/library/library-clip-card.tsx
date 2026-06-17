import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import type { ClipFormat, LibraryClipView } from "@/lib/clip";
import { FORMAT_OPTIONS } from "@/lib/studio";

// One Library clip card (Server, T3.1), ported from /design-reference screen 09's
// clip collection. Shows ONLY owned values: the source customer (the headline —
// P-II), the brand hook (when set, clearly the brand's words — render spec §7.4),
// the format, the created date, and an honest "Sample preview" label (clips are
// stubbed renders pre-T8 — FR-019). The WHOLE card links to the source PROOF
// (/app/proof/[proofId]) — the one existing destination (A-11 / Q2→C): no clip-detail
// nav (T3.2 unbuilt), no inline sample play (no real render), no metrics.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const FORMAT_LABEL: Record<ClipFormat, string> = Object.fromEntries(
  FORMAT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ClipFormat, string>;

const ASPECT: Record<ClipFormat, string> = {
  "9x16": "aspect-[9/16]",
  "1x1": "aspect-square",
  "4x5": "aspect-[4/5]",
  "16x9": "aspect-video",
};

export function LibraryClipCard({ clip }: { clip: LibraryClipView }) {
  return (
    <Link
      href={`/app/proof/${clip.proofId}`}
      aria-label={`Open ${clip.customerName}'s proof`}
      className="group block break-inside-avoid rounded-clip border border-hairline bg-card shadow-clip transition-shadow duration-200 ease-pressroom hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {/* clip frame in the chosen format — honest sample stand-in, not a real render */}
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-t-clip bg-sunken ${ASPECT[clip.format]}`}
      >
        <span className="rounded-pill bg-card/90 px-2.5 py-1 font-mono text-mono-sm uppercase tracking-wide text-ink-2">
          Sample preview
        </span>
        <span className="absolute bottom-2 right-2 rounded-pill bg-card/90 px-2 py-0.5 font-mono text-mono-sm text-ink-2">
          {FORMAT_LABEL[clip.format]}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-5">
        {/* brand hook — the brand's words, clearly framed (render spec §7.4) */}
        {clip.hook && (
          <p className="font-display text-display-xs text-ink">{clip.hook}</p>
        )}

        {/* the source customer — the headline (P-II) */}
        <div className="flex items-center gap-2">
          <span className="font-ui text-body-sm font-medium text-ink">
            {clip.customerName}
          </span>
          {clip.verified && (
            <span
              className="flex items-center text-persimmon"
              title="Verified real customer"
            >
              <BadgeCheck className="size-4" strokeWidth={1.5} aria-hidden />
              <span className="sr-only">Verified real customer</span>
            </span>
          )}
          <span className="ml-auto font-mono text-mono-sm text-ink-3">
            {formatDate(clip.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
