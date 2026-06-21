// Consent surface view shapes (T5-Consent). The consent backbone — which has gated
// every surface all session via the shared effectiveConsentState — gets its own
// surface. These are the owned, read-time projections the /app/consent ledger,
// per-proof history, and made-under provenance consume. CLIENT-SAFE: ConsentState /
// ClipFormat are type-only imports (erased at build, the clip.ts/proof.ts idiom); no
// DB code reaches any bundle. Owned consent data only — never a fabricated field
// (FR-019).

import type { ClipFormat } from "@/lib/clip";
import type { ConsentState } from "@/lib/proof";

// The consent purpose label (screen 13 shows "Marketing use · v{n}"). A single owned
// product label — the purpose consent is captured for — not a per-row fabricated value.
export const CONSENT_PURPOSE = "Marketing use";

// One ledger row — a proof's CURRENT effective consent (the ported screen-13 list).
export interface ConsentLedgerEntry {
  proofId: string;
  /** the customer (the headline — P-II) */
  customerName: string;
  /** the consent purpose label (owned) */
  purpose: string;
  /** current effective version; null if no consent row */
  currentVersion: number | null;
  /** ISO effective date of the current version (granted/revoked/created); null if none */
  effectiveAt: string | null;
  /** current effective state (granted | awaiting | revoked); UI labels 'revoked' as "Withdrawn" */
  state: ConsentState;
}

// One retained version in a proof's timeline — the audit trail (Q3:A full history).
// Superseded/withdrawn versions are SHOWN, never erased ("pull, don't destroy").
export interface ConsentVersionEntry {
  version: number;
  state: ConsentState;
  /** ISO effective date of this version (coalesce revokedAt / grantedAt / createdAt) */
  effectiveAt: string | null;
}

// One clip's made-under-consent provenance — the SHARED read row. The list powers
// BOTH the cascade-preview count (clips.length) and the provenance display (Q1 ∩ Q2).
export interface ProofConsentClip {
  clipId: string;
  format: ClipFormat;
  /** the consent version the clip was generated under (derived_asset.consentId → consent.version) */
  madeUnderVersion: number;
  /** ISO date the clip was created */
  createdAt: string;
}

// The per-proof detail bundle, fetched on row-open (one round-trip): the full retained
// timeline + the made-under provenance. clips.length is the cascade-preview N.
export interface ProofConsentDetail {
  history: ConsentVersionEntry[];
  clips: ProofConsentClip[];
}
