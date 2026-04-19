CREATE TABLE "email_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"content" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_email_id_sent_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."sent_emails"("id") ON DELETE cascade ON UPDATE no action;