// Schema is authoritative: ProofType / ConsentState derive from the Postgres
// enums in src/db/schema.ts (type-only import — erased at build, no DB/Drizzle
// code reaches any bundle). ProofView is the flattened shape the ProofCard
// consumes (proof row + resolved source label + effective consent state + ISO
// capturedAt). ProofCardProps aliases ProofView so the T0.2 ProofCard is unchanged.

import type { consentStateEnum, proofTypeEnum } from "@/db/schema";

export type ProofType = (typeof proofTypeEnum)["enumValues"][number];

export type ConsentState = (typeof consentStateEnum)["enumValues"][number];

export interface ProofView {
  id: string;
  customerName: string;
  proofType: ProofType;
  /** verbatim text proof (text proofs) */
  quote: string | null;
  /** transcript / caption (media proofs) */
  transcript: string | null;
  /** capture source label, e.g. Shopify, Stripe, Instagram, Calendly, Square */
  source: string;
  /** effective (latest-version) consent state */
  consentState: ConsentState;
  /** media reference; a neutral placeholder is used when absent */
  thumbnail?: string | null;
  /** ISO date the proof was captured */
  capturedAt: string;
  reviewed: boolean;
  verified: boolean;
}

export type ProofCardProps = ProofView;

// The proof-detail read shape (T2.3): a SUPERSET of ProofView that also carries
// the effective (latest-version) consent's version + effective date, so the
// detail can render "granted · {date} · v{n}" faithfully. ProofView/ProofCardProps
// above stay byte-unchanged — only the proof detail reads this richer projection
// (built ONLY in getProof). consentAt is granted→grantedAt / revoked→revokedAt /
// awaiting→createdAt; both fields are null only if a proof has no consent row.
export interface ProofDetailView extends ProofView {
  /** effective consent version ("v{n}"); null if no consent row exists */
  consentVersion: number | null;
  /** ISO effective-consent date; null when none applies */
  consentAt: string | null;
}
