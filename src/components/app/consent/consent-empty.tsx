import { ShieldCheck } from "lucide-react";
import Link from "next/link";

// The honest consent empty state (Server, T5-Consent). Shown when the workspace has
// no proof at all — so there is no consent to ledger. No fabricated rows. Orients the
// merchant toward the inbox, where consent is captured with each proof.

export function ConsentEmpty() {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <h1 className="font-display text-display-lg text-ink">Consent &amp; rights</h1>

      <div className="mt-10 flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-20 text-center shadow-clip">
        <span className="flex size-12 items-center justify-center rounded-control bg-sunken text-ink-2">
          <ShieldCheck className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-display-sm text-ink">
          No consent records yet.
        </h2>
        <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
          Each piece of proof carries the customer&rsquo;s consent. When proof
          arrives, its consent record appears here.
        </p>
        <Link
          href="/app/proof"
          className="mt-6 inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Browse proof
        </Link>
      </div>
    </div>
  );
}
