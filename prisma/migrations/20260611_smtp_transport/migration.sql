-- AlterTable: per-mailbox SMTP sending (send through the inbox's own server, not only the Brevo API).
ALTER TABLE "public"."Mailbox" ADD COLUMN "sendTransport" TEXT NOT NULL DEFAULT 'BREVO',
ADD COLUMN "smtpHost" TEXT,
ADD COLUMN "smtpPort" INTEGER NOT NULL DEFAULT 587,
ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "smtpUsername" TEXT,
ADD COLUMN "smtpPasswordEnc" TEXT;
