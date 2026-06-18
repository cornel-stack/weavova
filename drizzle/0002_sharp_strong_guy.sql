CREATE TYPE "public"."brand_asset_kind" AS ENUM('product', 'broll');--> statement-breakpoint
CREATE TABLE "brand_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" "brand_asset_kind" NOT NULL,
	"label" text NOT NULL,
	"asset_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_brand_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"proof_id" uuid NOT NULL,
	"brand_asset_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_asset" ADD CONSTRAINT "brand_asset_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_brand_asset" ADD CONSTRAINT "proof_brand_asset_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_brand_asset" ADD CONSTRAINT "proof_brand_asset_proof_id_proof_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proof"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_brand_asset" ADD CONSTRAINT "proof_brand_asset_brand_asset_id_brand_asset_id_fk" FOREIGN KEY ("brand_asset_id") REFERENCES "public"."brand_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_asset_ws_created_idx" ON "brand_asset" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "proof_brand_asset_unique" ON "proof_brand_asset" USING btree ("proof_id","brand_asset_id");--> statement-breakpoint
CREATE INDEX "proof_brand_asset_proof_idx" ON "proof_brand_asset" USING btree ("proof_id");--> statement-breakpoint
CREATE INDEX "proof_brand_asset_brand_asset_idx" ON "proof_brand_asset" USING btree ("brand_asset_id");