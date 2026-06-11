-- CreateEnum
CREATE TYPE "public"."InboundClassification" AS ENUM ('UNCLASSIFIED', 'INTERESTED', 'NOT_INTERESTED', 'OUT_OF_OFFICE', 'AUTO_REPLY', 'BOUNCE_NOTIFICATION', 'UNSUBSCRIBE_REQUEST', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "public"."LeadPriority" AS ENUM ('A', 'B', 'C');

-- AlterTable
ALTER TABLE "public"."Lead" ADD COLUMN "bestOffer" TEXT,
ADD COLUMN "priority" "public"."LeadPriority";

-- AlterTable
ALTER TABLE "public"."SendingDomain" ADD COLUMN "dkimSelector" TEXT DEFAULT 'mail',
ADD COLUMN "lastVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Mailbox" ADD COLUMN "hourlyCap" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN "imapPort" INTEGER NOT NULL DEFAULT 993,
ADD COLUMN "imapTls" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "imapPasswordEnc" TEXT,
ADD COLUMN "imapLastUid" INTEGER,
ADD COLUMN "imapUidValidity" BIGINT,
ADD COLUMN "imapLastSyncedAt" TIMESTAMP(3),
ADD COLUMN "imapLastError" TEXT;

-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN "rampEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rampStart" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "rampIncrement" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "pausedReason" TEXT;

-- AlterTable
ALTER TABLE "public"."OutboundMessage" ADD COLUMN "variantId" TEXT,
ADD COLUMN "nextRetryAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."SequenceStepVariant" (
    "id" TEXT NOT NULL,
    "sequenceStepId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SequenceStepVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboundMessage" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "leadId" TEXT,
    "campaignId" TEXT,
    "enrollmentId" TEXT,
    "outboundMessageId" TEXT,
    "messageId" TEXT NOT NULL,
    "inReplyTo" TEXT,
    "referencesHeader" TEXT,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "subject" TEXT,
    "rawHtml" TEXT,
    "rawText" TEXT,
    "cleanedText" TEXT,
    "snippet" TEXT,
    "classification" "public"."InboundClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
    "classificationSource" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "direction" TEXT NOT NULL DEFAULT 'INBOUND',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_bestOffer_priority_idx" ON "public"."Lead"("bestOffer", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceStepVariant_sequenceStepId_label_key" ON "public"."SequenceStepVariant"("sequenceStepId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "InboundMessage_mailboxId_messageId_key" ON "public"."InboundMessage"("mailboxId", "messageId");

-- CreateIndex
CREATE INDEX "InboundMessage_isRead_receivedAt_idx" ON "public"."InboundMessage"("isRead", "receivedAt");

-- CreateIndex
CREATE INDEX "InboundMessage_leadId_idx" ON "public"."InboundMessage"("leadId");

-- CreateIndex
CREATE INDEX "InboundMessage_campaignId_classification_idx" ON "public"."InboundMessage"("campaignId", "classification");

-- AddForeignKey
ALTER TABLE "public"."OutboundMessage" ADD CONSTRAINT "OutboundMessage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."SequenceStepVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SequenceStepVariant" ADD CONSTRAINT "SequenceStepVariant_sequenceStepId_fkey" FOREIGN KEY ("sequenceStepId") REFERENCES "public"."SequenceStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundMessage" ADD CONSTRAINT "InboundMessage_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "public"."Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundMessage" ADD CONSTRAINT "InboundMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundMessage" ADD CONSTRAINT "InboundMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundMessage" ADD CONSTRAINT "InboundMessage_outboundMessageId_fkey" FOREIGN KEY ("outboundMessageId") REFERENCES "public"."OutboundMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
