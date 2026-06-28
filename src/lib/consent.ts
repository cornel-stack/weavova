// Consent surface view shapes (T5-Consent). The consent backbone — which has gated
// every surface all session via the shared effectiveConsentState — gets its own
// surface. These are the owned, read-time projections the /app/consent ledger,
// per-proof history, and made-under provenance consume. CLIENT-SAFE: ConsentState /
// ClipFormat are type-only imports (erased at build, the clip.ts/proof.ts idiom); no
// DB code reaches any bundle. Owned consent data only — never a fabricated field
// (FR-019).

import type { consentScopeEnum, nameDisplayEnum } from "@/db/schema";
import type { ClipFormat } from "@/lib/clip";
import type { ConsentState } from "@/lib/proof";

// The consent purpose label (screen 13 shows "Marketing use · v{n}"). A single owned
// product label — the purpose consent is captured for — not a per-row fabricated value.
export const CONSENT_PURPOSE = "Marketing use";

// ── T7.1 — the scoped-consent (ConsentDisplay) model ────────────────────────────────
// Schema is authoritative: ConsentScope / NameDisplay derive from the Postgres enums
// (the type-only import is erased at build — the clip.ts/proof.ts idiom; client-safe).
export type ConsentScope = (typeof consentScopeEnum)["enumValues"][number]; // organic|paid|showcase|embed
export type NameDisplay = (typeof nameDisplayEnum)["enumValues"][number]; // full|first_initial|anonymous

// The display payload carried on each consent version (resolved at read for nameDisplay/
// showFace). `useScope` is the enforceable gate set; the others are presentation-only.
export interface ConsentDisplay {
  useScope: ConsentScope[];
  nameDisplay: NameDisplay;
  showFace: boolean;
}

// Least-privilege default for a NEW consent (T7.2 capture): organic only. paid/showcase/
// embed are explicit opt-ins, NEVER pre-granted (Consent Is Sacred — P-VII). The DB
// column default is '{}' (fail-closed); the app insert sets THIS explicitly so a granted
// row's intent is auditable, not an implicit DB default.
export const DEFAULT_USE_SCOPE: ConsentScope[] = ["organic"];

// The built-in fallback when a workspace has not set its display default (its columns are
// null). Privacy-forward but usable: first-initial naming, face shown. Resolution must
// never error on a missing workspace default — this constant guarantees that.
export const BUILTIN_DISPLAY_DEFAULT: { nameDisplay: NameDisplay; showFace: boolean } = {
  nameDisplay: "first_initial",
  showFace: true,
};

// Privacy ordering — HIGHER rank = MORE private. The single definition the override
// clamp depends on. nameDisplay: full < first_initial < anonymous ; showFace: true < false.
const NAME_DISPLAY_PRIVACY: Record<NameDisplay, number> = {
  full: 0,
  first_initial: 1,
  anonymous: 2,
};

// THE SOLE SANCTIONED WRITE PATH FOR DISPLAY RESOLUTION (binding — T7.1).
// Every place that decides a customer's stored display preference — the T7.2 capture
// write AND the seed — MUST route the (workspace default, customer override) pair through
// this function. The CRITICAL INVARIANT (FR-005, P-VII): a customer override may move ONLY
// toward MORE privacy; per field the result is the more-private of (default, override), so
// a less-private override is CLAMPED to the workspace default and the customer is NEVER
// recorded as less private than they chose. No side-door write may set a stored display
// value less private than the workspace default — if you need to set display, call this.
export function resolveDisplay(
  wsDefault: { nameDisplay: NameDisplay; showFace: boolean },
  override?: Partial<{ nameDisplay: NameDisplay; showFace: boolean }>,
): { nameDisplay: NameDisplay; showFace: boolean } {
  const nameDisplay =
    override?.nameDisplay != null &&
    NAME_DISPLAY_PRIVACY[override.nameDisplay] >
      NAME_DISPLAY_PRIVACY[wsDefault.nameDisplay]
      ? override.nameDisplay // strictly more private → honor it
      : wsDefault.nameDisplay; // equal / less private / absent → clamp to the default
  // showFace: false is more private than true; a less-private (true) override is clamped.
  const showFace =
    override?.showFace != null
      ? wsDefault.showFace === false
        ? false // default already hides the face — override can never re-show it
        : override.showFace // default shows; override may hide (false) or keep (true)
      : wsDefault.showFace;
  return { nameDisplay, showFace };
}

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
