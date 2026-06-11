-- CreateEnum
CREATE TYPE "public"."SendingDomainStatus" AS ENUM ('NEEDS_SETUP', 'AUTHENTICATING', 'READY', 'RISK', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."SendingDomainPurpose" AS ENUM ('OUTREACH', 'BRAND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "public"."MailboxProvider" AS ENUM ('BREVO_HOSTED', 'EMAIL_HOST', 'GOOGLE_WORKSPACE', 'MICROSOFT_365', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MailboxHealthStatus" AS ENUM ('UNVERIFIED', 'HEALTHY', 'WARNING', 'UNHEALTHY', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."MailboxConnectionStatus" AS ENUM ('NOT_CONFIGURED', 'READY', 'ERROR');

-- CreateTable
CREATE TABLE "public"."SendingDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "provider" TEXT,
    "hostLabel" TEXT,
    "purpose" "public"."SendingDomainPurpose" NOT NULL DEFAULT 'OUTREACH',
    "status" "public"."SendingDomainStatus" NOT NULL DEFAULT 'NEEDS_SETUP',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "dnsChecklist" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SendingDomain_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."Mailbox" ADD COLUMN "connectionStatus" "public"."MailboxConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
ADD COLUMN "domainId" TEXT,
ADD COLUMN "healthStatus" "public"."MailboxHealthStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "hostLabel" TEXT,
ADD COLUMN "imapHost" TEXT,
ADD COLUMN "imapUsername" TEXT,
ADD COLUMN "localPart" TEXT,
ADD COLUMN "maxDailyCap" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "provider" "public"."MailboxProvider" NOT NULL DEFAULT 'BREVO_HOSTED',
ADD COLUMN "rampIncrement" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "rampStart" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "rotationWeight" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."CampaignMailbox" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MailboxDailyUsage" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "usageDate" TIMESTAMP(3) NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxDailyUsage_pkey" PRIMARY KEY ("id")
);

-- Backfill the campaign pool with each campaign's existing mailbox.
INSERT INTO "public"."CampaignMailbox" ("id", "campaignId", "mailboxId", "weight", "isActive", "createdAt")
SELECT CONCAT('cmpmb_', substr(md5(random()::text || clock_timestamp()::text), 1, 18)), "id", "mailboxId", 1, true, CURRENT_TIMESTAMP
FROM "public"."Campaign"
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "SendingDomain_domain_key" ON "public"."SendingDomain"("domain");

-- CreateIndex
CREATE INDEX "Mailbox_domainId_idx" ON "public"."Mailbox"("domainId");

-- CreateIndex
CREATE INDEX "Mailbox_isActive_healthStatus_idx" ON "public"."Mailbox"("isActive", "healthStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMailbox_campaignId_mailboxId_key" ON "public"."CampaignMailbox"("campaignId", "mailboxId");

-- CreateIndex
CREATE INDEX "CampaignMailbox_campaignId_isActive_idx" ON "public"."CampaignMailbox"("campaignId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MailboxDailyUsage_mailboxId_usageDate_key" ON "public"."MailboxDailyUsage"("mailboxId", "usageDate");

-- AddForeignKey
ALTER TABLE "public"."Mailbox" ADD CONSTRAINT "Mailbox_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "public"."SendingDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignMailbox" ADD CONSTRAINT "CampaignMailbox_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignMailbox" ADD CONSTRAINT "CampaignMailbox_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "public"."Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MailboxDailyUsage" ADD CONSTRAINT "MailboxDailyUsage_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "public"."Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
