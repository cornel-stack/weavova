CREATE TYPE "public"."consent_scope" AS ENUM('organic', 'paid', 'showcase', 'embed');--> statement-breakpoint
CREATE TYPE "public"."name_display" AS ENUM('full', 'first_initial', 'anonymous');--> statement-breakpoint
ALTER TABLE "consent" ADD COLUMN "use_scope" "consent_scope"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "consent" ADD COLUMN "name_display" "name_display";--> statement-breakpoint
ALTER TABLE "consent" ADD COLUMN "show_face" boolean;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "default_name_display" "name_display";--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "default_show_face" boolean;--> statement-breakpoint
CREATE INDEX "consent_use_scope_gin" ON "consent" USING gin ("use_scope");--> statement-breakpoint
-- T7.1 backfill (hand-appended; idempotent + guarded for the SHARED Neon DB).
-- Restores the full-trust behaviour existing GRANTED rows already had (granted == usable
-- everywhere) — honest prior behaviour (P-XIV), not an invented grant. Non-granted
-- (awaiting/revoked) versions keep use_scope '{}' (they grant nothing; the gate fails
-- closed on them anyway). Guarded so a re-run changes 0 rows.
UPDATE "consent" SET "use_scope" = '{organic,paid,showcase,embed}' WHERE "state" = 'granted' AND "use_scope" = '{}';--> statement-breakpoint
-- Display backfill: name_display 'full' renders the stored name verbatim = today's exact
-- presentation; show_face true matches current behaviour. Guarded on IS NULL → idempotent.
UPDATE "consent" SET "name_display" = 'full', "show_face" = true WHERE "name_display" IS NULL;