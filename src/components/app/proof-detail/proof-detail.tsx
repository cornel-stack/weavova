import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type {
  BrandAssetView,
  ProofBrandAssetView,
} from "@/lib/brand-asset";
import type { ClipView } from "@/lib/clip";
import type { ProofDetailView } from "@/lib/proof";
import { AttachedBrandAssets } from "./attached-brand-assets";
import { ProofDetailActions } from "./proof-detail-actions";
import { ProofDetailConsent } from "./proof-detail-consent";
import { ProofDetailGeneratedAssets } from "./proof-detail-generated-assets";
import { ProofDetailMedia } from "./proof-detail-media";
import { ProofDetailMeta } from "./proof-detail-meta";

// The Proof detail layout (Server, T2.3), ported from /design-reference screen 03.
// Two columns: the content column leads with the customer's verbatim words (the
// headline — Principle II), with the CONDITIONAL media region above it (renders
// nothing when the proof has no media — Q1); the side panel carries the metadata,
// the read-only consent panel, and the consent-gated "Make a clip" (links to the
// clip studio — T2.4b).
// No tab chrome (Q3): the transcript is the content. No warmth/sentiment panel, no
// product/variant, no generated-asset counts (FR-019).

export function ProofDetail({
  proof,
  clips,
  attachedBrandAssets,
  storeAssets,
}: {
  proof: ProofDetailView;
  clips: ClipView[];
  attachedBrandAssets: ProofBrandAssetView[];
  storeAssets: BrandAssetView[];
}) {
  const isMedia = proof.proofType !== "text";
  const words = isMedia ? proof.transcript : proof.quote;

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      {/* sub-header: back to inbox + customer */}
      <Link
        href="/app/proof"
        className="inline-flex items-center gap-1.5 font-ui text-body-sm text-ink-2 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        Proof
      </Link>
      <h1 className="mt-3 font-display text-display-md text-ink">
        {proof.customerName}
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* content column — the customer's words lead (the headline) */}
        <div className="space-y-6 lg:col-span-2">
          <ProofDetailMedia proof={proof} />
          {words && (
            <blockquote className="font-display text-quote text-ink">
              {words}
            </blockquote>
          )}
          <ProofDetailGeneratedAssets clips={clips} />
          <AttachedBrandAssets
            proofId={proof.id}
            attached={attachedBrandAssets}
            storeAssets={storeAssets}
          />
        </div>

        {/* side panel — provenance, consent, the one action */}
        <aside className="flex flex-col gap-6">
          <ProofDetailMeta proof={proof} />
          <ProofDetailConsent proof={proof} />
          <ProofDetailActions proof={proof} />
        </aside>
      </div>
    </div>
  );
}
