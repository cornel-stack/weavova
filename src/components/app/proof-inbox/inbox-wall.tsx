"use client";

import Link from "next/link";
import { ProofCard } from "@/components/proof-card";
import type { ProofView } from "@/lib/proof";

// The masonry "Wall" (T2.2), ported from /design-reference screen 02. CSS
// multi-column layout (columns-1 → 2 → 3) with each item break-inside-avoid — the
// screen-02 Wall with no JS masonry dependency (research D3; column-major flow is
// acceptable and faithful).
//
// Navigation (research D1): each canonical ProofCard is wrapped in a `relative`
// container with a SIBLING stretched-link overlay — an absolutely-positioned
// <Link> that covers the card — so the whole card opens the proof detail WITHOUT
// modifying the byte-unchanged ProofCard and without nesting the card's "Make"
// button inside an anchor. The `wv-wall-card` class (see globals.css) lifts the
// card's own (absolutely-positioned) "Make" button above this overlay so it stays
// independently operable and reveals on card hover.

export function InboxWall({ proofs }: { proofs: ProofView[] }) {
  return (
    <div className="mt-6 columns-1 gap-6 sm:columns-2 lg:columns-3">
      {proofs.map((proof) => (
        <div
          key={proof.id}
          className="wv-wall-card relative mb-6 break-inside-avoid"
        >
          <ProofCard {...proof} />
          <Link
            href={`/app/proof/${proof.id}`}
            aria-label={`Open ${proof.customerName}'s proof`}
            className="absolute inset-0 z-10 rounded-clip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>
      ))}
    </div>
  );
}
