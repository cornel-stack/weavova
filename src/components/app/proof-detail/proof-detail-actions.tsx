import { Scissors } from "lucide-react";
import Link from "next/link";
import type { ProofDetailView } from "@/lib/proof";

// The detail's action cluster (Server, T2.3; wired to the studio at T2.4b). Per the
// A-11 resolution (FR-016c), ONLY "Make a clip" renders, and it is CONSENT-GATED: it
// appears only when consent is "granted" (P-VII — no asset path from non-consented
// proof). It now LINKS to the clip studio (/app/proof/[id]/studio) — no longer inert
// (FR-001 / A-11). "Carousel" (T4), "Embed" (T5), and "Ask this customer for more"
// (outreach) are NOT rendered — deferred whole until their tiers, so the panel is not
// a dead toolbar. For non-granted proof there is no action (honest — read-only).

export function ProofDetailActions({ proof }: { proof: ProofDetailView }) {
  if (proof.consentState !== "granted") {
    return null;
  }

  return (
    <Link
      href={`/app/proof/${proof.id}/studio`}
      className="inline-flex items-center justify-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <Scissors className="size-4" strokeWidth={1.5} aria-hidden />
      Make a clip
    </Link>
  );
}
