import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

// The honest not-found panel (Server, T2.3 — US3 tenant isolation). Renders ZERO
// proof content (no name, words, source, consent, or metadata) and no raw error.
// The copy is identical whether the id is missing or belongs to another workspace —
// it never reveals which (no existence oracle, SC-005). A back-to-inbox link is the
// only affordance. Lives inside the persisting AppChrome.

export function ProofDetailNotFound() {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <Link
        href="/app/proof"
        className="inline-flex items-center gap-1.5 font-ui text-body-sm text-ink-2 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        Proof
      </Link>

      <div className="mt-10 flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-20 text-center shadow-clip">
        <span className="flex size-12 items-center justify-center rounded-control bg-sunken text-ink-2">
          <FileQuestion className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-display-sm text-ink">
          Proof not found
        </h1>
        <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
          This proof doesn&rsquo;t exist, or it isn&rsquo;t in this workspace.
        </p>
        <Link
          href="/app/proof"
          className="mt-6 inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Back to the inbox
        </Link>
      </div>
    </div>
  );
}
