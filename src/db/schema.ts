import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// `source.kind` is text + this code-side allowlist (open, growing integration
// set — adding a platform must not require a schema migration). Validate at the
// write boundary against SOURCE_KINDS.
export const SOURCE_KINDS = [
  "shopify",
  "stripe",
  "instagram",
  "calendly",
  "square",
  // T7.2 — the public capture link (/c/[token]). A real owned channel: a proof captured
  // via a request link gets a `link` source (label "Capture link"). Code-side allowlist
  // only (source.kind is text), so this is additive — NO migration.
  "link",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

// Closed, stable domains → Postgres enums (DB-level integrity).
export const proofTypeEnum = pgEnum("proof_type", [
  "text",
  "video",
  "photo",
  "audio",
]);
export const consentStateEnum = pgEnum("consent_state", [
  "granted",
  "awaiting",
  "revoked",
]);
// The scoped-consent payload (T7.1). `consent_scope` is the ENFORCEABLE gate set —
// which uses a customer permitted (organic post / paid ad / public showcase /
// embeddable block). A closed enum keeps an "unknown scope" unrepresentable at write
// time (FR-012); stored as a `consent_scope[]` array so the fail-closed scope gate is
// one GIN-indexed containment predicate, never a jsonb scan. `name_display` is how the
// customer is named on a clip (presentation-only — never gated). Least-privilege:
// a new consent grants `organic` only; broader scopes are explicit opt-ins.
export const consentScopeEnum = pgEnum("consent_scope", [
  "organic",
  "paid",
  "showcase",
  "embed",
]);
export const nameDisplayEnum = pgEnum("name_display", [
  "full",
  "first_initial",
  "anonymous",
]);

// The tenant a proof belongs to. Minimal for now; real workspaces/auth at T6.
export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // T7.1 (Q1=A) — the workspace-level display DEFAULT a customer override starts from
  // (nullable → BUILTIN_DISPLAY_DEFAULT when unset). The workspace row is the natural
  // per-workspace singleton; brand_kit was rejected (multi-row, no workspaceId unique).
  // A customer can only override toward MORE privacy than this default (resolveDisplay).
  defaultNameDisplay: nameDisplayEnum("default_name_display"),
  defaultShowFace: boolean("default_show_face"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The origin of a proof; becomes a first-class connected integration at T7.
// `kind` is text + a code-side allowlist (open, growing set — see T007).
export const source = pgTable("source", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The core entity. Reconciles the T0.2 ProofCard props type (see src/lib/proof.ts).
export const proof = pgTable("proof", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull(),
  proofType: proofTypeEnum("proof_type").notNull(),
  quote: text("quote"),
  transcript: text("transcript"),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => source.id, { onDelete: "restrict" }),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  reviewed: boolean("reviewed").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  thumbnail: text("thumbnail"),
  // T7.2 — the captured SOURCE-media R2 key (video this slice; audio/photo later).
  // NULLABLE: text proof + every existing fixture is null and behaves exactly as before.
  // DISTINCT from `thumbnail` (a poster image, T8). The real media is KEPT here; PLAYBACK
  // is the T8 render-engine's job (it reads mediaUrl) — pre-T8 a media proof renders through
  // the existing non-playing "media stored · playback coming" seam, never a <video>/<img>.
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The consent gate (Principle VII): versioned, revocable, cascade-ready.
// Rows are append-only versions per proof; the effective consent is the latest
// version (max `version`). Revocation = a new row with state 'revoked' (never a
// delete), so the history is auditable.
//
// `consent.id` is a stable PK. At T2, `derived_asset.consentId` will FK to it so
// that revoking a proof's consent cascades to withdraw its derived assets. The
// (proofId, version) uniqueness + the (proofId, version desc) index make the
// latest-version lookup and that future cascade expressible without reshaping.
export const consent = pgTable(
  "consent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proofId: uuid("proof_id")
      .notNull()
      .references(() => proof.id, { onDelete: "cascade" }),
    state: consentStateEnum("state").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    version: integer("version").notNull(),
    captureContext: jsonb("capture_context"),
    // T7.1 — the ConsentDisplay payload, per version (the version is the effective one
    // when it's the latest). `useScope` is the enforceable gate (default '{}' = permits
    // NOTHING — the fail-closed baseline; the app insert sets ['organic'] explicitly for
    // a new grant, so intent is auditable, not a DB default). `nameDisplay`/`showFace`
    // are presentation-only and nullable → resolved at read via the workspace default →
    // BUILTIN_DISPLAY_DEFAULT fallback chain. Typed columns only — NO jsonb (captureContext
    // is untouched, it records capture provenance, not display prefs).
    useScope: consentScopeEnum("use_scope").array().notNull().default([]),
    nameDisplay: nameDisplayEnum("name_display"),
    showFace: boolean("show_face"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("consent_proof_version_unique").on(t.proofId, t.version),
    index("consent_proof_version_idx").on(t.proofId, t.version.desc()),
    // GIN serves `use_scope @> array[...]` containment for the fail-closed scope gate
    // (the T9 forward-contract) without a per-row JSON parse.
    index("consent_use_scope_gin").using("gin", t.useScope),
  ],
);

// Closed, stable domains for derived assets (T2.4a) → Postgres enums.
export const derivedAssetKindEnum = pgEnum("derived_asset_kind", [
  "clip",
  "carousel",
  "embed",
]);
export const clipFormatEnum = pgEnum("clip_format", [
  "9x16",
  "1x1",
  "4x5",
  "16x9",
]);

// A generated asset (a clip) produced from a proof (T2.4a — the data layer for the
// clip studio). Linked to its source `proof` and to the `consent` it was made under.
//
// `consentId` is PROVENANCE + hard-delete integrity ONLY. Revocation is a new
// `revoked` consent version (never a delete), so `onDelete: cascade` NEVER fires on
// revocation — a clip is *withdrawn* at READ time when the proof's effective consent
// is not 'granted' (P-VII). The row is retained for audit. The T8 render-pipeline
// fields (transcript/captions, highlight, reframe, music licensing, approval/
// distribution) are resolved upstream and are NOT stored here.
export const derivedAsset = pgTable(
  "derived_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    proofId: uuid("proof_id")
      .notNull()
      .references(() => proof.id, { onDelete: "cascade" }),
    // provenance: the consent version the clip was made under (+ hard-delete only)
    consentId: uuid("consent_id")
      .notNull()
      .references(() => consent.id, { onDelete: "cascade" }),
    kind: derivedAssetKindEnum("kind").notNull(),
    format: clipFormatEnum("format").notNull(),
    assetUrl: text("asset_url").notNull(), // stored (stubbed) sample-clip reference
    hook: text("hook"), // owned brand-authored hook provenance
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("derived_asset_ws_created_idx").on(t.workspaceId, t.createdAt.desc()),
    index("derived_asset_proof_idx").on(t.proofId),
  ],
);

// Closed, stable domain for the brand's OWN footage (T4-B2) → Postgres enum.
// Mirrors the derivedAssetKindEnum/clipFormatEnum pattern. Extensible by migration.
export const brandAssetKindEnum = pgEnum("brand_asset_kind", [
  "product", // a product video
  "broll", // b-roll / supporting footage
]);

// A brand-OWNED clip in the reusable store (T4-B2 — the brand's own product video /
// b-roll). Workspace-scoped, uploaded ONCE and reusable across many proofs. This is
// the brand's OWN footage — NOT customer proof: it sits OUTSIDE the consent model
// (no consentId, no FK to `consent`), is never counted as proof (FR-019), and is
// SUPPORTING CONTEXT for the eventual render, never the headline (P-II). `assetUrl`
// is a REAL R2 object (a presigned direct upload), distinct from the stubbed
// `SAMPLE_CLIP_URL` clip seam. The T8 composite (weaving this into a clip) is NOT
// modelled here — that is the render engine.
export const brandAsset = pgTable(
  "brand_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    kind: brandAssetKindEnum("kind").notNull(),
    label: text("label").notNull(), // owner-authored, free text
    assetUrl: text("asset_url").notNull(), // the real R2 object URL
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("brand_asset_ws_created_idx").on(t.workspaceId, t.createdAt.desc()),
  ],
);

// The many-to-many attach (T4-B2): one brand asset → many proofs, one proof → many
// brand assets. Workspace-scoped; UNIQUE on (proofId, brandAssetId) so attaching the
// same asset to the same proof is idempotent (no duplicate row). The join carries NO
// consent reference — attaching owned footage never touches the consent gate (P-VII);
// a withdrawn proof still cannot generate a clip, asset attached or not. Detach =
// delete the join row only (the asset and other proofs' attachments survive).
// Delete-from-store is a CONSCIOUS DEFERRAL (Q2:A — block-while-attached + R2 object
// cleanup, later); B2 ships no asset delete.
export const proofBrandAsset = pgTable(
  "proof_brand_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    proofId: uuid("proof_id")
      .notNull()
      .references(() => proof.id, { onDelete: "cascade" }),
    brandAssetId: uuid("brand_asset_id")
      .notNull()
      .references(() => brandAsset.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("proof_brand_asset_unique").on(t.proofId, t.brandAssetId),
    index("proof_brand_asset_proof_idx").on(t.proofId),
    index("proof_brand_asset_brand_asset_idx").on(t.brandAssetId),
  ],
);

// The brand kit (T5-BrandKit) — a workspace's OWNED visual identity (logo, one brand
// colour, a curated font pair). Distinct from brand_asset (reusable footage); this is
// visual identity. OWNED brand data — NO consent reference, no proof linkage (like
// brand_asset). `logoAssetUrl` is the real R2 object URL (reusing B2's R2 path) and is
// NULLABLE — null = the honest "no logo yet" state (never a broken <img>); the seed
// leaves it null. `brandColor` is one hex (auto-contrast is DERIVED at read time, not
// stored). `fonts` is the curated pick { display, body }.
//
// NO unique constraint on workspaceId — the table is naturally MULTI-ROW so promoting
// to multiple kits later is additive UI, no migration; v1 manages the single row.
export const brandKit = pgTable(
  "brand_kit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name"), // optional kit name
    logoAssetUrl: text("logo_asset_url"), // R2 URL; null = no logo (honest empty state)
    brandColor: text("brand_color").notNull(), // one hex; contrast derived, not stored
    fonts: jsonb("fonts").notNull(), // the curated { display, body } pick
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("brand_kit_ws_idx").on(t.workspaceId)],
);

// ============================================================================
// Auth.js v5 (T6) — the @auth/drizzle-adapter standard tables. ADDITIVE: no
// existing table changes. These are VENDOR-SHAPED: column/property names follow
// the canonical Auth.js Drizzle schema (camelCase, text id) so the adapter binds
// to them — a deliberate, contained deviation from our snake_case house style.
// The adapter generates user ids; `email` is the account-linking key (FR-003).
// ============================================================================

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { withTimezone: true }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ============================================================================
// Membership (T6) — the user↔workspace link, app-level (NOT an adapter table).
// Carries `role` from the first migration (FR-018): owner = full access; member
// = read + create-clip only (enforcement is minimal v1 — see data-model.md).
// UNIQUE (userId, workspaceId) makes provisioning/backfill idempotent. `workspace`
// is UNCHANGED; content rows keep their workspaceId (no ownership backfill).
// ============================================================================
export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "member",
]);

export const membership = pgTable(
  "membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("membership_user_workspace_unique").on(t.userId, t.workspaceId),
    index("membership_user_idx").on(t.userId),
  ],
);

// ============================================================================
// Capture (T7.2) — the request primitive + verification basis. ADDITIVE: no
// existing table/column changes. A `capture_request` addresses a real customer to
// the public /c/[token] page; the token is PER-REQUEST, SINGLE-USE, and EXPIRING
// (72h). `verification_basis` records WHY a proof can later earn the "Verified real"
// stamp — a REAL consent leg (captured at /c/[token]) + a STUB transaction leg
// (transaction_verified_at stays null until T7.5). No stamp is shown until both legs
// exist; proof.verified stays false this slice.
// ============================================================================
export const captureRequestStatusEnum = pgEnum("capture_request_status", [
  "open",
  "used",
  "expired",
]);

export const captureRequest = pgTable(
  "capture_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    // the capture channel the resulting proof is sourced from (the `link` source)
    sourceId: uuid("source_id")
      .notNull()
      .references(() => source.id, { onDelete: "restrict" }),
    // per-request, high-entropy, URL-safe; the public lookup key + the single-use guard
    token: text("token").notNull(),
    customerName: text("customer_name"), // brand-addressed prompt / thank-you (nullable)
    // T7.3 — the recipient address for the Email delivery path (free-email entry, C7). The ONLY
    // additive column this slice adds to capture_request; the token columns are untouched.
    customerEmail: text("customer_email"),
    transactionRef: text("transaction_ref"), // transaction-leg context for the T7.5 verified bar
    status: captureRequestStatusEnum("status").notNull().default("open"),
    // authoritative access check is `expires_at > now()`; a stale status never grants access
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("capture_request_token_unique").on(t.token),
    index("capture_request_ws_idx").on(t.workspaceId),
  ],
);

export const verificationBasis = pgTable("verification_basis", {
  id: uuid("id").primaryKey().defaultRandom(),
  proofId: uuid("proof_id")
    .notNull()
    .references(() => proof.id, { onDelete: "cascade" }),
  requestId: uuid("request_id")
    .notNull()
    .references(() => captureRequest.id, { onDelete: "restrict" }),
  // the consent leg — REAL (set when the customer grants consent at capture)
  consentCapturedAt: timestamp("consent_captured_at", {
    withTimezone: true,
  }).notNull(),
  // the transaction leg — STUB (null this slice; set in T7.5). Both non-null ⇒ verifiable.
  transactionVerifiedAt: timestamp("transaction_verified_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============================================================================
// Requests (T7.3) — the merchant-side "send the ask". ADDITIVE: no existing table/column
// changes (capture_request gains only `customer_email` above). TWO new entities, kept
// distinct from the minted `capture_request`:
//   • request_template — a REUSABLE ask definition the builder (06) saves. `manual_link` is
//     the LIVE trigger; shopify/stripe/calendly persist as config but are honest P-XIII
//     "coming" states (the deferred webhook/Sources track). The automation-mints-from-template
//     bridge is shaped-for-later, NOT built here.
//   • request_send — one row per DISPATCH (email or link). Powers honest per-request delivery
//     state (C5) AND the template "N sent" aggregate = count(request_send). No opens/clicks
//     columns — we never store unverifiable engagement (P-XIV).
// ============================================================================
export const requestTriggerEnum = pgEnum("request_trigger", [
  "manual_link",
  "shopify",
  "stripe",
  "calendly",
]);
export const requestChannelEnum = pgEnum("request_channel", ["email", "link"]);
export const requestDeliveryStatusEnum = pgEnum("request_delivery_status", [
  "accepted", // Resend accepted the email for delivery
  "failed", // send attempted, rejected — honest, NOT "sent"
  "link_generated", // link channel — a copyable URL, no email
]);

export const requestTemplate = pgTable(
  "request_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    triggerType: requestTriggerEnum("trigger_type").notNull(),
    deliveryChannel: requestChannelEnum("delivery_channel").notNull(),
    sendTiming: text("send_timing"), // free text ("3 days after fulfillment"); informational for manual_link
    consentLine: text("consent_line").notNull(), // verbatim consent shown at capture (P-VII)
    consentVersion: text("consent_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("request_template_ws_idx").on(t.workspaceId)],
);

export const requestSend = pgTable(
  "request_send",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // the minted instance that was dispatched (the T7.2 primitive; cascade with it)
    requestId: uuid("request_id")
      .notNull()
      .references(() => captureRequest.id, { onDelete: "cascade" }),
    // the template it was created from (null for ad-hoc modal sends); powers "N sent"
    templateId: uuid("template_id").references(() => requestTemplate.id, {
      onDelete: "set null",
    }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    channel: requestChannelEnum("channel").notNull(),
    recipientEmail: text("recipient_email"), // the address emailed; null for link
    deliveryStatus: requestDeliveryStatusEnum("delivery_status").notNull(),
    providerId: text("provider_id"), // Resend message id when returned
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("request_send_template_idx").on(t.templateId),
    index("request_send_request_idx").on(t.requestId),
  ],
);
