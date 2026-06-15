import { BadgeCheck, Play, Scissors, Store } from "lucide-react";
import type { ConsentState, ProofView } from "@/lib/proof";

// The latest-proof hero (T2.1), ported from screen 01's hero treatment. The
// customer's verbatim words (Fraunces, larger than a grid card) are the largest,
// warmest element (P-II). The "Make a clip" persimmon action appears ONLY when
// consent is granted (P-VII) and is present-but-not-yet-wired (the studio is
// T2.4). Self-contained: the canonical ProofCard stays byte-unchanged, so the
// small display helpers are duplicated here rather than shared from it.

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

export function DashboardHero({ proof }: { proof: ProofView }) {
  const {
    customerName,
    proofType,
    quote,
    transcript,
    source,
    consentState,
    capturedAt,
    verified,
  } = proof;

  const isMedia = proofType !== "text";
  const proofText = isMedia ? transcript : quote;
  // Never offer to generate a clip from non-consented proof (Principle VII).
  const canMake = consentState === "granted";

  return (
    <article className="grid grid-cols-1 gap-6 rounded-clip border border-hairline bg-card p-6 shadow-clip md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-8">
      {/* media proof — neutral thumbnail (no real person); omitted for text */}
      {isMedia && (
        <div className="relative flex aspect-video items-center justify-center rounded-control bg-sunken">
          <Play className="size-9 text-ink-2" strokeWidth={1.5} aria-hidden />
          <span className="absolute bottom-2 left-2 rounded-pill bg-card/90 px-2 py-0.5 font-mono text-mono-sm text-ink-2">
            customer {proofType}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {verified && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-persimmon-tint px-2.5 py-1 font-ui text-label uppercase tracking-wide text-persimmon-deep">
            <BadgeCheck className="size-3.5" strokeWidth={1.5} aria-hidden />
            Verified real customer
          </span>
        )}

        {/* the proof — the customer's words, in Fraunces (the headline) */}
        {proofText && (
          <blockquote className="font-display text-display-md text-ink lg:text-display-lg">
            “{proofText}”
          </blockquote>
        )}

        {/* quiet meta — customer + source */}
        <div className="flex flex-wrap items-center gap-2">
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

        {/* consent + captured date, and the consent-gated clip action */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-mono-sm text-ink-3">
          <span className="flex items-center gap-2">
            <span
              className={`size-2 rounded-pill ${CONSENT_DOT[consentState]}`}
              aria-hidden
            />
            <span>{CONSENT_LABEL[consentState]}</span>
          </span>
          <span>·</span>
          <span>{formatDate(capturedAt)}</span>

          {canMake && (
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1.5 rounded-control bg-persimmon px-3 py-1.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Scissors className="size-3.5" strokeWidth={1.5} aria-hidden />
              Make a clip
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
