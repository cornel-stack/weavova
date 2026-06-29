// Client-safe view types + constants for T7.3 Requests (types/consts only — no DB code reaches
// any bundle; the proof.ts/capture.ts idiom). Drives the authenticated /app request surfaces.
// INCREMENT 1 wires the manual person-driven send: the Ask-for-more modal (ref 23) on a proof.
// The templates grid (05) + builder (06) + their trigger set land in Increment 2.

// The delivery channel a request is sent over.
export type RequestChannel = "email" | "link";

// The trigger types the builder (06) offers. Only `manual_link` is WIRED in T7; the automated
// triggers are honest P-XIII "coming" states (the deferred webhook/Sources track). Increment 2
// renders these on the builder; the modal send (Increment 1) is `manual_link` only.
export type RequestTrigger = "manual_link" | "shopify" | "stripe" | "calendly";

export interface TriggerOption {
  value: RequestTrigger;
  label: string;
  wired: boolean;
}
export const REQUEST_TRIGGERS: TriggerOption[] = [
  { value: "manual_link", label: "Manual link", wired: true },
  { value: "shopify", label: "Shopify", wired: false },
  { value: "stripe", label: "Stripe", wired: false },
  { value: "calendly", label: "Calendly", wired: false },
];

// The Ask-for-more modal (ref 23) view: pre-addressed to a proof's customer. No customer email
// is stored anywhere (free-email entry, C7) → there is no address to pre-fill; the name fills the
// card only. `sourceLabel` is honest provenance (e.g. "Capture link" / "Shopify") — never a
// fabricated product noun (P-XIV).
export interface AskForMoreView {
  proofId: string;
  customerName: string;
  sourceLabel: string;
}

// The verbatim message scaffold (ref 23). The merchant edits it; it is sent as typed — never
// model-authored or altered. Generic (no fabricated product noun, P-XIV — the design's
// "soy candle · fig & cedar" is mock data we do not have).
export function askForMoreMessage(firstName: string): string {
  return `Hi ${firstName} — thank you again! Would you be up for a quick follow-up on how things are holding up?`;
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// Shared shapes for the createAndSendRequest server action (kept here, client-safe, so the
// "use server" module exports only async functions and the modal can import the types).
export interface CreateAndSendInput {
  channel: RequestChannel;
  recipientEmail?: string; // required + validated when channel === "email"
  customerName?: string | null;
  templateId?: string | null; // set when created from a template (Increment 2)
  message?: string | null; // ref-23 editable note (verbatim)
}

export type CreateAndSendResult =
  | { status: "ok"; channel: "link"; captureUrl: string }
  | { status: "ok"; channel: "email"; captureUrl: string; delivery: "accepted" }
  | { status: "sent_failed"; captureUrl: string } // request minted, email failed — link usable
  | { status: "invalid"; reason: string };

// Permissive email shape check (the modal pre-validates; the action re-validates).
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
