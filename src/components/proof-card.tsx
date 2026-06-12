import { Play, Store } from "lucide-react";
import type { ConsentState, ProofCardProps } from "@/lib/proof";

// Ported from the export's `wv-clip` (design-reference screens 01 Dashboard /
// 02 Proof inbox). Proof-forward: the customer's words (Fraunces) — or the
// media thumbnail — is the largest, warmest element; chrome stays quiet.

const CONSENT_DOT: Record<ConsentState, string> = {
  granted: "bg-success",
  awaiting: "bg-warning",
  revoked: "bg-danger",
};

const CONSENT_LABEL: Record<ConsentState, string> = {
  granted: "Consent granted",
  awaiting: "Awaiting consent",
  revoked: "Consent revoked",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function ProofCard(props: ProofCardProps) {
  const {
    customerName,
    proofType,
    quote,
    transcript,
    source,
    consentState,
    capturedAt,
  } = props;

  const isMedia = proofType !== "text";
  const proofText = isMedia ? transcript : quote;

  return (
    <article className="group relative flex flex-col gap-4 rounded-clip border border-hairline bg-card p-5 shadow-clip transition-shadow duration-200 ease-pressroom hover:shadow-lift">
      {/* media proof — thumbnail (neutral placeholder, no real person) */}
      {isMedia && (
        <div className="relative flex aspect-video items-center justify-center rounded-control bg-sunken">
          <Play className="size-7 text-ink-2" strokeWidth={1.5} aria-hidden />
          <span className="absolute bottom-2 left-2 rounded-pill bg-card/90 px-2 py-0.5 font-mono text-mono-sm text-ink-2">
            customer {proofType}
          </span>
        </div>
      )}

      {/* the proof — the customer's words, in Fraunces (the headline) */}
      {proofText && (
        <blockquote className="font-display text-quote text-ink">
          {proofText}
        </blockquote>
      )}

      {/* quiet meta — customer + source */}
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-pill bg-sunken font-display text-mono-sm text-ink">
          {initials(customerName)}
        </span>
        <span className="font-ui text-body-sm font-medium text-ink">
          {customerName}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-ink-3">
          <Store className="size-3.5" strokeWidth={1.5} aria-hidden />
          <span className="font-mono text-mono-sm">{source}</span>
        </span>
      </div>

      {/* quiet meta — consent + captured date */}
      <div className="flex items-center gap-2 font-mono text-mono-sm text-ink-3">
        <span
          className={`size-2 rounded-pill ${CONSENT_DOT[consentState]}`}
          aria-hidden
        />
        <span>{CONSENT_LABEL[consentState]}</span>
        <span className="ml-auto">{formatDate(capturedAt)}</span>
      </div>
    </article>
  );
}
