import { ArrowLeft, BadgeCheck, Play, Store } from "lucide-react";
import Link from "next/link";
import type { ProofDetailView } from "@/lib/proof";
import { ClipStudioForm } from "./clip-studio-form";

// The clip studio surface (Server, T2.4b), ported from /design-reference screen 04.
// It opens FROM a piece of proof (Principle VIII): the SOURCE proof leads as the
// headline (the customer's verbatim words, Fraunces — Principle II), then the
// configure-and-generate island. A faithful A-11 port: the pictured pipeline/un-owned
// controls — cutaways/product-media, a music library, a multi-brand-kit selector, the
// scene/highlight timeline, "auto-stitched · N scenes", and AI suggestions — are NOT
// rendered (no backing data; T7/T8). No view/reach/engagement metric (FR-012). The
// interactive Format + hook + Generate live in <ClipStudioForm>.

export function ClipStudio({ proof }: { proof: ProofDetailView }) {
  const isMedia = proof.proofType !== "text";
  const words = isMedia ? proof.transcript : proof.quote;

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      {/* close — back to the proof */}
      <Link
        href={`/app/proof/${proof.id}`}
        className="inline-flex items-center gap-1.5 font-ui text-body-sm text-ink-2 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        {proof.customerName}
      </Link>
      <h1 className="mt-3 font-display text-display-md text-ink">Clip studio</h1>

      {/* the source proof — the headline (Principle II) */}
      <div className="mt-8 flex flex-col gap-4 rounded-clip border border-hairline bg-card p-6 shadow-clip">
        {isMedia && (
          <div className="relative flex aspect-video max-w-md items-center justify-center rounded-control bg-sunken">
            <Play className="size-8 text-ink-2" strokeWidth={1.5} aria-hidden />
            <span className="absolute bottom-2 left-2 rounded-pill bg-card/90 px-2 py-0.5 font-mono text-mono-sm text-ink-2">
              customer {proof.proofType}
            </span>
          </div>
        )}
        {words && (
          <blockquote className="font-display text-quote text-ink">
            {words}
          </blockquote>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-ui text-body-sm font-medium text-ink">
            {proof.customerName}
          </span>
          {proof.verified && (
            <span
              className="flex items-center text-persimmon"
              title="Verified real customer"
            >
              <BadgeCheck className="size-4" strokeWidth={1.5} aria-hidden />
              <span className="sr-only">Verified real customer</span>
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-ink-3">
            <Store className="size-3.5" strokeWidth={1.5} aria-hidden />
            <span className="font-mono text-mono-sm">{proof.source}</span>
          </span>
        </div>
      </div>

      {/* configure-and-generate (Principle VIII — no editor) */}
      <div className="mt-8">
        <ClipStudioForm proofId={proof.id} />
      </div>
    </div>
  );
}
