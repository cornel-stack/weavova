CREATE TYPE "public"."consent_state" AS ENUM('granted', 'awaiting', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."proof_type" AS ENUM('text', 'video', 'photo', 'audio');--> statement-breakpoint
CREATE TABLE "consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proof_id" uuid NOT NULL,
	"state" "consent_state" NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"version" integer NOT NULL,
	"capture_context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"proof_type" "proof_type" NOT NULL,
	"quote" text,
	"transcript" text,
	"source_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"reviewed" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"thumbnail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_proof_id_proof_id_fk" FOREIGN KEY ("proof_id") REFERENCES "public"."proof"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof" ADD CONSTRAINT "proof_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof" ADD CONSTRAINT "proof_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consent_proof_version_unique" ON "consent" USING btree ("proof_id","version");--> statement-breakpoint
CREATE INDEX "consent_proof_version_idx" ON "consent" USING btree ("proof_id","version" DESC NULLS LAST);