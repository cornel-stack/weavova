import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import type { ClipFormat } from "@/lib/clip";
import { FORMAT_OPTIONS } from "@/lib/studio";
import type { ShowcaseItem as ShowcaseItemType } from "@/lib/showcase";

// One Showcase wall item (Server, T-Showcase). Its OWN public-style presentation —
// NOT the canonical ProofCard: it omits ProofCard's internal chrome (the consent dot,
// the "Unreviewed" stamp, the "Make" button) because a public-style wall shows none of
// those. Owned data only (FR-019); the verified mark is surfaced (not a gate). The
// whole item links to its detail — proof → /app/proof/[id], clip → /app/clip/[id]
// (both exist; A-11-clean). A clip is an honest non-playing "Sample preview" still.

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

const cardClass =
  "group block break-inside-avoid rounded-clip border border-hairline bg-card p-5 shadow-clip transition-shadow duration-200 ease-pressroom hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Attribution({
  customerName,
  verified,
  date,
}: {
  customerName: string;
  verified: boolean;
  date: string;
}) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="font-ui text-body-sm font-medium text-ink">
        {customerName}
      </span>
      {verified && (
        <span
          className="flex items-center text-persimmon"
          title="Verified real customer"
        >
          <BadgeCheck className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Verified real customer</span>
        </span>
      )}
      <span className="ml-auto font-mono text-mono-sm text-ink-3">{date}</span>
    </div>
  );
}

export function ShowcaseItem({ item }: { item: ShowcaseItemType }) {
  if (item.kind === "proof") {
    const { proof } = item;
    const words = proof.proofType !== "text" ? proof.transcript : proof.quote;
    return (
      <Link
        href={`/app/proof/${proof.id}`}
        aria-label={`Open ${proof.customerName}'s proof`}
        className={cardClass}
      >
        {words && (
          <blockquote className="font-display text-quote text-ink">
            {words}
          </blockquote>
        )}
        <Attribution
          customerName={proof.customerName}
          verified={proof.verified}
          date={formatDate(proof.capturedAt)}
        />
      </Link>
    );
  }

  const { clip } = item;
  return (
    <Link
      href={`/app/clip/${clip.id}`}
      aria-label={`Open ${clip.customerName}'s clip`}
      className={cardClass}
    >
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-control bg-sunken ${ASPECT[clip.format]}`}
      >
        <span className="rounded-pill bg-card/90 px-2.5 py-1 font-mono text-mono-sm uppercase tracking-wide text-ink-2">
          Sample preview
        </span>
        <span className="absolute bottom-2 right-2 rounded-pill bg-card/90 px-2 py-0.5 font-mono text-mono-sm text-ink-2">
          {FORMAT_LABEL[clip.format]}
        </span>
      </div>
      {clip.hook && (
        <p className="mt-4 font-display text-display-xs text-ink">{clip.hook}</p>
      )}
      <Attribution
        customerName={clip.customerName}
        verified={clip.verified}
        date={formatDate(clip.createdAt)}
      />
    </Link>
  );
}
