import { ShieldAlert } from "lucide-react";
import Link from "next/link";

// The honest "consent required" derived state (T2.4b — P-VII, P-XII). Shown when a
// proof's effective consent is not 'granted' — either at open (a directly-reached
// studio for a non-granted proof) or when the generate-time re-check blocks. NO clip
// is produced. There is no design-reference screen for this; it is an honest derived
// state, not an invented design. Pure presentational (no server-only code) so it is
// safely shared by the Server studio-data branch and the Client form result.

export function StudioConsentRequired({ proofId }: { proofId: string }) {
  return (
    <div className="flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-16 text-center shadow-clip">
      <span className="flex size-12 items-center justify-center rounded-control bg-warning-tint text-warning">
        <ShieldAlert className="size-6" strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="mt-5 font-display text-display-sm text-ink">
        Consent required
      </h2>
      <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
        This proof&rsquo;s consent isn&rsquo;t currently granted, so no clip can be
        made from it. A clip is only ever produced from proof the customer has
        consented to share.
      </p>
      <Link
        href={`/app/proof/${proofId}`}
        className="mt-6 inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Back to the proof
      </Link>
    </div>
  );
}
