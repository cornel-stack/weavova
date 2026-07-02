// T6.2 — the onboarding-wizard vocabularies. ONE source of truth for the two additive
// workspace columns' allowlists + their design-verbatim labels, shared by the data-layer
// writes (validation), the step pages (cards), and any later reader (the wizard renames /
// smart-defaults consumer). Text + code-side allowlist — the source.kind precedent, no pgEnum.

// ── Step 1 · Business type (design: 1 _ Business type  _onboard_role) ─────────
export const BUSINESS_TYPES = [
  "ecommerce",
  "services",
  "saas",
  "local",
  "creator",
  "agency",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export function isBusinessType(v: unknown): v is BusinessType {
  return typeof v === "string" && (BUSINESS_TYPES as readonly string[]).includes(v);
}

// Verbatim from the design: title + subcopy.
export const BUSINESS_TYPE_OPTIONS: {
  value: BusinessType;
  label: string;
  sub: string;
}[] = [
  { value: "ecommerce", label: "E-commerce", sub: "Products, shipping, repeat buyers" },
  { value: "services", label: "Services & bookings", sub: "Appointments, clients, sessions" },
  { value: "saas", label: "SaaS", sub: "Subscriptions, trials, seats" },
  { value: "local", label: "Local business", sub: "Walk-ins, regulars, reviews" },
  { value: "creator", label: "Creator", sub: "Audience, drops, community" },
  { value: "agency", label: "Agency", sub: "Multiple clients & brands" },
];

// ── Step 4 · First format (design: 4 _ First format  _onboard_format) ─────────
// PREFERENCE ONLY — the render engine (T8) honours this; nothing is produced now (P-XIV).
export const FIRST_FORMATS = [
  "raw_review",
  "ugc",
  "digital_product",
  "physical_product",
  "quote_card",
] as const;
export type FirstFormat = (typeof FIRST_FORMATS)[number];

export function isFirstFormat(v: unknown): v is FirstFormat {
  return typeof v === "string" && (FIRST_FORMATS as readonly string[]).includes(v);
}

// Verbatim from the design — LABEL-ONLY tiles (the design shows no per-tile subcopy; the
// tiles are DECORATIVE static illustration, not a preview/render of the user's proof). We do
// NOT invent descriptors the design doesn't carry (P-V / P-XII).
export const FIRST_FORMAT_OPTIONS: {
  value: FirstFormat;
  label: string;
}[] = [
  { value: "raw_review", label: "Raw review" },
  { value: "ugc", label: "UGC" },
  { value: "digital_product", label: "Digital product" },
  { value: "physical_product", label: "Physical product" },
  { value: "quote_card", label: "Quote card" },
];
