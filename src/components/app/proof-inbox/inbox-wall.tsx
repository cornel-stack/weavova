"use client";

import { Check } from "lucide-react";
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
//
// SELECTION MODE (T4-B1): when `selecting`, the nav link is replaced by a SIBLING
// selection overlay — for a granted proof a full-cover toggle at z-30 (ABOVE the
// card's lifted z-20 "Make" button, so a click anywhere toggles selection and both
// nav + Make are suppressed); for a non-granted proof a non-interactive "needs
// consent" badge (not selectable, no nav). ProofCard stays byte-UNCHANGED.

export function InboxWall({
  proofs,
  selecting = false,
  selected,
  onToggleProof,
}: {
  proofs: ProofView[];
  selecting?: boolean;
  selected?: ReadonlySet<string>;
  onToggleProof?: (id: string) => void;
}) {
  return (
    <div className="mt-6 columns-1 gap-6 sm:columns-2 lg:columns-3">
      {proofs.map((proof) => {
        const isSelected = selected?.has(proof.id) ?? false;
        const canSelect = proof.consentState === "granted";
        return (
          <div
            key={proof.id}
            className="wv-wall-card relative mb-6 break-inside-avoid"
          >
            <ProofCard {...proof} />

            {!selecting && (
              <Link
                href={`/app/proof/${proof.id}`}
                aria-label={`Open ${proof.customerName}'s proof`}
                className="absolute inset-0 z-10 rounded-clip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
            )}

            {/* selection overlay — z-30 covers the card incl. the z-20 Make button */}
            {selecting && canSelect && (
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`Select ${proof.customerName}'s proof`}
                onClick={() => onToggleProof?.(proof.id)}
                className={`absolute inset-0 z-30 rounded-clip ring-inset transition-shadow duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  isSelected ? "ring-2 ring-ink" : "ring-0 hover:ring-1 hover:ring-rule"
                }`}
              >
                <span
                  className={`absolute right-3 top-3 flex size-6 items-center justify-center rounded-pill border ${
                    isSelected
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-card text-transparent"
                  }`}
                >
                  <Check className="size-4" strokeWidth={2} aria-hidden />
                </span>
              </button>
            )}

            {/* non-granted: not selectable — honest "needs consent", no nav */}
            {selecting && !canSelect && (
              <div className="absolute inset-0 z-30 flex items-start justify-end rounded-clip bg-card/40 p-3">
                <span className="rounded-pill border border-rule bg-card px-2.5 py-1 font-mono text-mono-sm uppercase tracking-wide text-ink-3">
                  needs consent
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
