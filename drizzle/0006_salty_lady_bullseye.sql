CREATE TYPE "public"."capture_request_status" AS ENUM('open', 'used', 'expired');--> statement-breakpoint
CREATE TABLE "capture_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"token" text NOT NULL,
	"customer_name" text,
	"transaction_ref" text,
	"status" "capture_request_status" DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_basis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proof_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"consent_captured_at" timestamp with time zone NOT NULL,
	"transaction_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capture_request" ADD CONSTRAINT "capture_request_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_request" ADD CONSTRAINT "capture_request_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_basis" ADD CONSTRAINT "verification_basis_proof_id_proof_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proof"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_basis" ADD CONSTRAINT "verification_basis_request_id_capture_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."capture_request"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "capture_request_token_unique" ON "capture_request" USING btree ("token");--> statement-breakpoint
CREATE INDEX "capture_request_ws_idx" ON "capture_request" USING btree ("workspace_id");