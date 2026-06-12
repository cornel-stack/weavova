// Props type for the canonical ProofCard. Anticipates the T0.3 `proof` entity;
// the real schema/fixtures must remain shape-compatible with this (Fixtures-first).

export type ProofType = "text" | "video" | "photo" | "audio";

export type ConsentState = "granted" | "awaiting" | "revoked";

export interface ProofCardProps {
  id: string;
  customerName: string;
  proofType: ProofType;
  /** verbatim text proof (text proofs) */
  quote: string | null;
  /** transcript / caption (media proofs) */
  transcript: string | null;
  /** capture source, e.g. Shopify, Stripe, Instagram, Calendly, Square */
  source: string;
  consentState: ConsentState;
  /** media reference; a neutral placeholder is used when absent */
  thumbnail?: string | null;
  /** ISO date the proof was captured */
  capturedAt: string;
  reviewed: boolean;
  verified: boolean;
}
