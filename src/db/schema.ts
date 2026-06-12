import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// `source.kind` is text + this code-side allowlist (open, growing integration
// set — adding a platform must not require a schema migration). Validate at the
// write boundary against SOURCE_KINDS.
export const SOURCE_KINDS = [
  "shopify",
  "stripe",
  "instagram",
  "calendly",
  "square",
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

// The tenant a proof belongs to. Minimal for now; real workspaces/auth at T6.
export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("consent_proof_version_unique").on(t.proofId, t.version),
    index("consent_proof_version_idx").on(t.proofId, t.version.desc()),
  ],
);
