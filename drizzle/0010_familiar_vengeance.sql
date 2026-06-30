CREATE TYPE "public"."media_status" AS ENUM('captured', 'normalizing', 'normalized', 'failed');--> statement-breakpoint
CREATE TABLE "webhook_endpoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"capture_request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capture_request" ADD COLUMN "transaction_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proof" ADD COLUMN "normalized_media_url" text;--> statement-breakpoint
ALTER TABLE "proof" ADD COLUMN "media_status" "media_status";--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD CONSTRAINT "webhook_endpoint_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD CONSTRAINT "webhook_endpoint_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_event" ADD CONSTRAINT "webhook_event_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_event" ADD CONSTRAINT "webhook_event_capture_request_id_capture_request_id_fk" FOREIGN KEY ("capture_request_id") REFERENCES "public"."capture_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_endpoint_workspace_unique" ON "webhook_endpoint" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_endpoint_secret_unique" ON "webhook_endpoint" USING btree ("secret");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_ws_key_unique" ON "webhook_event" USING btree ("workspace_id","event_key");