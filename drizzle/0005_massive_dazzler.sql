ALTER TABLE "sent_emails" ALTER COLUMN "html_body" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sent_emails" ADD COLUMN "text_body" text;