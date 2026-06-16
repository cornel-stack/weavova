import { Scissors } from "lucide-react";
import type { ProofDetailView } from "@/lib/proof";

// The detail's action cluster (Server, T2.3). Per the A-11 resolution (FR-016c),
// ONLY "Make a clip" renders — present-but-inert (no handler, never errors; wired
// to the clip studio at T2.4) and CONSENT-GATED: it appears only when consent is
// "granted" (P-VII — no asset path from non-consented proof). "Carousel" (T4),
// "Embed" (T5), and "Ask this customer for more" (outreach) are NOT rendered —
// deferred whole until their tiers, so the panel is not a dead toolbar. For
// non-granted proof there is no action (honest — read-only).

export function ProofDetailActions({ proof }: { proof: ProofDetailView }) {
  if (proof.consentState !== "granted") {
    return null;
  }

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <Scissors className="size-4" strokeWidth={1.5} aria-hidden />
      Make a clip
    </button>
  );
}
