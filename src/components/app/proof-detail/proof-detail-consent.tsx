import type { ConsentState, ProofDetailView } from "@/lib/proof";

// The consent panel (Server, T2.3) — READ-ONLY. Shows the effective (latest-version)
// consent state, its date, and its version, all owned data from the consent table
// (never fabricated, FR-019). No grant/revoke/edit control and no multi-version
// "Record" history (deferred) — real consent management is a later tier (FR-018).
// The dot colour matches the canonical ProofCard's consent treatment.

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function ProofDetailConsent({ proof }: { proof: ProofDetailView }) {
  const { consentState, consentAt, consentVersion } = proof;

  // "{date} · v{n}" — each part only when present; computed, never fabricated.
  const meta = [
    consentAt ? formatDate(consentAt) : null,
    consentVersion != null ? `v${consentVersion}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-clip border border-hairline bg-card p-5 shadow-clip">
      <h3 className="font-ui text-label uppercase tracking-wide text-ink-3">
        Consent
      </h3>
      <div className="mt-3 flex items-center gap-2 font-ui text-body-sm text-ink">
        <span
          className={`size-2 rounded-pill ${CONSENT_DOT[consentState]}`}
          aria-hidden
        />
        <span className="font-medium">{CONSENT_LABEL[consentState]}</span>
      </div>
      {meta && (
        <p className="mt-2 font-mono text-mono-sm text-ink-3">{meta}</p>
      )}
    </div>
  );
}
