CREATE TYPE "public"."basis_source" AS ENUM('native', 'webhook', 'manual');--> statement-breakpoint
CREATE TYPE "public"."basis_strength" AS ENUM('strong', 'medium', 'weak');--> statement-breakpoint
ALTER TABLE "verification_basis" ALTER COLUMN "request_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_basis" ADD COLUMN "source" "basis_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_basis" ADD COLUMN "strength" "basis_strength" DEFAULT 'weak' NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_basis" ADD COLUMN "transaction_ref" text;--> statement-breakpoint
CREATE INDEX "verification_basis_proof_idx" ON "verification_basis" USING btree ("proof_id");