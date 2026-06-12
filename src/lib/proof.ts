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
