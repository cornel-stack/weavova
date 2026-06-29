CREATE TYPE "public"."request_channel" AS ENUM('email', 'link');--> statement-breakpoint
CREATE TYPE "public"."request_delivery_status" AS ENUM('accepted', 'failed', 'link_generated');--> statement-breakpoint
CREATE TYPE "public"."request_trigger" AS ENUM('manual_link', 'shopify', 'stripe', 'calendly');--> statement-breakpoint
CREATE TABLE "request_send" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"template_id" uuid,
	"workspace_id" uuid NOT NULL,
	"channel" "request_channel" NOT NULL,
	"recipient_email" text,
	"delivery_status" "request_delivery_status" NOT NULL,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"trigger_type" "request_trigger" NOT NULL,
	"delivery_channel" "request_channel" NOT NULL,
	"send_timing" text,
	"consent_line" text NOT NULL,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capture_request" ADD COLUMN "customer_email" text;--> statement-breakpoint
ALTER TABLE "request_send" ADD CONSTRAINT "request_send_request_id_capture_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."capture_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_send" ADD CONSTRAINT "request_send_template_id_request_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."request_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_send" ADD CONSTRAINT "request_send_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_template" ADD CONSTRAINT "request_template_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "request_send_template_idx" ON "request_send" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "request_send_request_idx" ON "request_send" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "request_template_ws_idx" ON "request_template" USING btree ("workspace_id");