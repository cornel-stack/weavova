import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
