// T7.5 — the SOLE sanctioned producer of a proof's verified-state. Every surface reads
// verified through this resolver; no projection selects the (write-frozen) proof.verified
// column. "Verified real customer" is EARNED, not asserted: it requires BOTH legs —
//   (1) the proof's effective (latest-version) consent is GRANTED (T7.1), AND
//   (2) a qualifying transaction basis (strength strong|medium + a confirmed transaction).
// The resolver SHORT-CIRCUITS on consent: a withdrawn/awaiting proof is never verified, even
// with a strong basis (P-VII — consent is necessary). A weak basis (a merchant ASSERTION, not
// a system CONFIRMATION) never earns the stamp (FR-019 — the moat: the stamp must not mean
// "someone said so"). Pure module — type-only DB import, no Drizzle reaches any bundle.

import type { ConsentState } from "./proof";

// The three honest states. Cards read the boolean (stamp / absence); the richer state drives
// the proof-detail in-between label (T7.5 Increment 2).
export type VerificationState =
  | "verified" // consent granted + qualifying basis
  | "consent_only" // consent granted, no qualifying basis (honest in-between)
  | "unverified_no_consent"; // consent not granted (awaiting/revoked) — never verified

export interface VerificationInput {
  /** effective (latest-version) consent state — from the T7.1 effectiveConsentState read */
  consentState: ConsentState;
  /** a qualifying basis exists: strength in (strong,medium) AND transaction_verified_at not null */
  hasQualifyingBasis: boolean;
}

export function verificationState(input: VerificationInput): VerificationState {
  if (input.consentState !== "granted") return "unverified_no_consent";
  return input.hasQualifyingBasis ? "verified" : "consent_only";
}

/** The boolean every stamp surface reads — true iff both legs hold. */
export function proofIsVerified(input: VerificationInput): boolean {
  return verificationState(input) === "verified";
}
