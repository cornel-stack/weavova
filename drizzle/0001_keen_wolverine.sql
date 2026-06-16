CREATE TYPE "public"."clip_format" AS ENUM('9x16', '1x1', '4x5', '16x9');--> statement-breakpoint
CREATE TYPE "public"."derived_asset_kind" AS ENUM('clip', 'carousel', 'embed');--> statement-breakpoint
CREATE TABLE "derived_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"proof_id" uuid NOT NULL,
	"consent_id" uuid NOT NULL,
	"kind" "derived_asset_kind" NOT NULL,
	"format" "clip_format" NOT NULL,
	"asset_url" text NOT NULL,
	"hook" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "derived_asset" ADD CONSTRAINT "derived_asset_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_asset" ADD CONSTRAINT "derived_asset_proof_id_proof_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proof"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_asset" ADD CONSTRAINT "derived_asset_consent_id_consent_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "derived_asset_ws_created_idx" ON "derived_asset" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "derived_asset_proof_idx" ON "derived_asset" USING btree ("proof_id");