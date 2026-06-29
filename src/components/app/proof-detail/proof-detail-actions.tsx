import { Scissors } from "lucide-react";
import Link from "next/link";
import type { ProofDetailView } from "@/lib/proof";
import { AskForMore } from "./ask-for-more-modal";

// The detail's action cluster (Server, T2.3; studio at T2.4b; outreach at T7.3). "Make a clip"
// is CONSENT-GATED — it appears only when consent is "granted" (P-VII — no asset path from
// non-consented proof) and links to the clip studio. "Ask this customer for more" (T7.3, ref 23)
// is OUTREACH — it does NOT use this proof's consent (the new request gathers its own at capture),
// so it renders for ANY proof (D4). "Carousel" (T4) / "Embed" (T5) remain deferred. The panel is
// never a dead toolbar.

export function ProofDetailActions({ proof }: { proof: ProofDetailView }) {
  return (
    <div className="flex flex-col gap-3">
      {proof.consentState === "granted" && (
        <Link
          href={`/app/proof/${proof.id}/studio`}
          className="inline-flex items-center justify-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Scissors className="size-4" strokeWidth={1.5} aria-hidden />
          Make a clip
        </Link>
      )}
      <AskForMore
        proofId={proof.id}
        customerName={proof.customerName}
        sourceLabel={proof.source}
      />
    </div>
  );
}
