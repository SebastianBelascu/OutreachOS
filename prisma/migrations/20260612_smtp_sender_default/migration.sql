-- Prefer per-mailbox SMTP for new senders. Brevo API remains selectable per mailbox.
ALTER TABLE "public"."Mailbox" ALTER COLUMN "sendTransport" SET DEFAULT 'SMTP';
ALTER TABLE "public"."Mailbox" ALTER COLUMN "provider" SET DEFAULT 'EMAIL_HOST';
