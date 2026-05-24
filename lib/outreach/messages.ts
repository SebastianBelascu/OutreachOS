import { Prisma, type MessageEventType, type MessageStatus, type SuppressionReason } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { stopLeadInCampaign } from "@/lib/outreach/campaigns";
import { mapBrevoEventType, sendBrevoTransactionalEmail, type BrevoTransactionalWebhookPayload } from "@/lib/outreach/brevo";
import { buildEventKey, getDatePartsInTimeZone, isWithinSendWindow } from "@/lib/outreach/format";
import type { DispatchSummary, SendSummary, SendWindow } from "@/lib/outreach/types";

function parseWindow(value: Prisma.JsonValue) {
  const candidate = value as unknown as Partial<SendWindow>;
  return {
    days: candidate.days ?? [1, 2, 3, 4, 5],
    startHour: candidate.startHour ?? 9,
    endHour: candidate.endHour ?? 17,
  };
}

async function countMailboxDeliveriesToday(mailboxId: string, timezone: string) {
  const now = new Date();
  const parts = getDatePartsInTimeZone(now, timezone);
  const start = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0));
  const end = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0));

  return prisma.outboundMessage.count({
    where: {
      mailboxId,
      sentAt: {
        gte: start,
        lt: end,
      },
      status: {
        in: ["SENT", "DELIVERED", "OPENED", "CLICKED"],
      },
    },
  });
}

export async function dispatchDueMessages(limit = 25): Promise<DispatchSummary> {
  const run = await prisma.cronJobRun.create({
    data: {
      jobName: "outreach-dispatch",
    },
  });

  const now = new Date();
  const candidates = await prisma.outboundMessage.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: {
        lte: now,
      },
      campaign: {
        status: "ACTIVE",
      },
    },
    include: {
      campaign: true,
      mailbox: true,
      lead: {
        include: {
          suppressions: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit * 3,
  });

  let claimedCount = 0;
  let skippedCount = 0;

  for (const message of candidates) {
    if (claimedCount >= limit) {
      break;
    }

    if (message.lead.suppressions.length > 0) {
      await prisma.outboundMessage.update({
        where: { id: message.id },
        data: {
          status: "SUPPRESSED",
        },
      });
      skippedCount += 1;
      continue;
    }

    const currentSendCount = await countMailboxDeliveriesToday(
      message.mailboxId,
      message.mailbox.timezone,
    );
    const mailboxWindow = parseWindow(message.mailbox.sendWindow);
    const campaignWindow = parseWindow(message.campaign.sendWindow);
    const nowWithinMailbox = isWithinSendWindow(now, message.mailbox.timezone, mailboxWindow);
    const nowWithinCampaign = isWithinSendWindow(now, message.campaign.timezone, campaignWindow);

    if (
      currentSendCount >= Math.min(message.mailbox.dailyCap, message.campaign.dailyLimit) ||
      !nowWithinMailbox ||
      !nowWithinCampaign
    ) {
      skippedCount += 1;
      continue;
    }

    const updated = await prisma.outboundMessage.updateMany({
      where: {
        id: message.id,
        status: "SCHEDULED",
      },
      data: {
        status: "CLAIMED",
        claimedAt: now,
      },
    });

    if (updated.count > 0) {
      claimedCount += 1;
    }
  }

  await prisma.cronJobRun.update({
    where: { id: run.id },
    data: {
      status: "SUCCEEDED",
      finishedAt: new Date(),
      summary: {
        claimedCount,
        skippedCount,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    claimedCount,
    skippedCount,
    runId: run.id,
  };
}

export async function sendClaimedMessages(limit = 25): Promise<SendSummary> {
  const run = await prisma.cronJobRun.create({
    data: {
      jobName: "outreach-send",
    },
  });

  const messages = await prisma.outboundMessage.findMany({
    where: {
      status: "CLAIMED",
    },
    include: {
      mailbox: true,
      lead: true,
      campaign: true,
      sequenceStep: true,
    },
    orderBy: { claimedAt: "asc" },
    take: limit,
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const message of messages) {
    try {
      const response = await sendBrevoTransactionalEmail({
        sender: {
          email: message.mailbox.fromEmail,
          name: message.mailbox.fromName,
        },
        replyTo: message.mailbox.replyTo
          ? {
              email: message.mailbox.replyTo,
            }
          : undefined,
        to: [
          {
            email: message.lead.email,
            name: `${message.lead.firstName ?? ""} ${message.lead.lastName ?? ""}`.trim() || undefined,
          },
        ],
        subject: message.subject,
        htmlContent: message.htmlBody,
        tags: message.tags,
        headers: {
          "X-OutreachOS-Message-ID": message.id,
          "X-OutreachOS-Campaign-ID": message.campaignId,
          "X-OutreachOS-Lead-ID": message.leadId,
          "X-OutreachOS-Step-ID": message.sequenceStepId,
        },
      });

      await prisma.outboundMessage.update({
        where: { id: message.id },
        data: {
          status: "SENT",
          providerMessageId: response.messageId,
          sentAt: new Date(),
          threadRef: response.messageId,
        },
      });

      await prisma.lead.update({
        where: { id: message.leadId },
        data: { status: "CONTACTED" },
      });

      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      await prisma.outboundMessage.update({
        where: { id: message.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          retryCount: {
            increment: 1,
          },
          failureReason: error instanceof Error ? error.message : "Unknown Brevo failure",
        },
      });
    }
  }

  skippedCount = Math.max(0, limit - messages.length);

  await prisma.cronJobRun.update({
    where: { id: run.id },
    data: {
      status: failedCount > 0 ? "FAILED" : "SUCCEEDED",
      finishedAt: new Date(),
      summary: {
        sentCount,
        failedCount,
        skippedCount,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    sentCount,
    failedCount,
    skippedCount,
    runId: run.id,
  };
}

function mapEventToMessageStatus(eventType: MessageEventType) {
  const statusMap: Record<MessageEventType, MessageStatus> = {
    SENT: "SENT",
    DELIVERED: "DELIVERED",
    OPENED: "OPENED",
    CLICKED: "CLICKED",
    SOFT_BOUNCE: "FAILED",
    HARD_BOUNCE: "BOUNCED",
    INVALID: "FAILED",
    DEFERRED: "FAILED",
    COMPLAINT: "SUPPRESSED",
    UNSUBSCRIBED: "SUPPRESSED",
    BLOCKED: "SUPPRESSED",
    ERROR: "FAILED",
  };

  return statusMap[eventType] ?? "FAILED";
}

async function createSuppressionFromEvent(
  leadId: string,
  campaignId: string | null,
  mailboxId: string | null,
  reason: SuppressionReason,
  source: string,
) {
  await prisma.suppressionEntry.create({
    data: {
      leadId,
      campaignId,
      mailboxId,
      reason,
      source,
    },
  });
}

export async function processTransactionalWebhook(payload: BrevoTransactionalWebhookPayload) {
  const eventType = mapBrevoEventType(payload.event) as MessageEventType;
  const messageId = payload["message-id"] ?? "unknown";
  const occurredAt =
    payload.date && Number.isNaN(Date.parse(payload.date))
      ? new Date()
      : payload.date
        ? new Date(payload.date)
        : new Date();
  const eventKey = buildEventKey(eventType, messageId, payload.ts_event ?? payload.ts ?? occurredAt.toISOString());

  const existingEvent = await prisma.emailEvent.findUnique({
    where: { eventKey },
  });

  if (existingEvent) {
    return existingEvent;
  }

  const outboundMessage = await prisma.outboundMessage.findFirst({
    where: {
      OR: [
        { providerMessageId: messageId },
        { id: String(payload["X-OutreachOS-Message-ID"] ?? "") },
      ],
    },
  });

  const eventRecord = await prisma.emailEvent.create({
    data: {
      eventKey,
      eventType,
      providerMessageId: messageId,
      leadEmail: payload.email ?? null,
      payload: payload as unknown as Prisma.InputJsonValue,
      occurredAt,
      outboundMessageId: outboundMessage?.id,
      campaignId: outboundMessage?.campaignId,
      leadId: outboundMessage?.leadId,
    },
  });

  if (!outboundMessage) {
    return eventRecord;
  }

  const nextStatus = mapEventToMessageStatus(eventType);
  const nextData: Prisma.OutboundMessageUpdateInput = {
    status: nextStatus as never,
  };

  if (eventType === "DELIVERED") {
    nextData.deliveredAt = occurredAt;
  }
  if (eventType === "OPENED") {
    nextData.openedAt = occurredAt;
  }
  if (eventType === "CLICKED") {
    nextData.clickedAt = occurredAt;
  }
  if (["SOFT_BOUNCE", "HARD_BOUNCE", "INVALID", "DEFERRED", "ERROR"].includes(eventType)) {
    nextData.failedAt = occurredAt;
    nextData.failureReason = payload.reason ? String(payload.reason) : eventType;
  }

  await prisma.outboundMessage.update({
    where: { id: outboundMessage.id },
    data: nextData,
  });

  if (eventType === "OPENED") {
    await prisma.lead.update({
      where: { id: outboundMessage.leadId },
      data: { status: "OPENED" },
    });
  }

  if (eventType === "HARD_BOUNCE") {
    await prisma.lead.update({
      where: { id: outboundMessage.leadId },
      data: { status: "BOUNCED" },
    });
    await createSuppressionFromEvent(
      outboundMessage.leadId,
      outboundMessage.campaignId,
      outboundMessage.mailboxId,
      "HARD_BOUNCE",
      "brevo:webhook",
    );
    await stopLeadInCampaign(outboundMessage.leadId, outboundMessage.campaignId, "Hard bounce");
  }

  if (eventType === "UNSUBSCRIBED") {
    await createSuppressionFromEvent(
      outboundMessage.leadId,
      outboundMessage.campaignId,
      outboundMessage.mailboxId,
      "UNSUBSCRIBED",
      "brevo:webhook",
    );
    await stopLeadInCampaign(outboundMessage.leadId, outboundMessage.campaignId, "Unsubscribed");
  }

  if (eventType === "COMPLAINT") {
    await createSuppressionFromEvent(
      outboundMessage.leadId,
      outboundMessage.campaignId,
      outboundMessage.mailboxId,
      "COMPLAINT",
      "brevo:webhook",
    );
    await stopLeadInCampaign(outboundMessage.leadId, outboundMessage.campaignId, "Spam complaint");
  }

  if (eventType === "INVALID") {
    await createSuppressionFromEvent(
      outboundMessage.leadId,
      outboundMessage.campaignId,
      outboundMessage.mailboxId,
      "INVALID_EMAIL",
      "brevo:webhook",
    );
  }

  return eventRecord;
}

export async function unsubscribeMessageByToken(token: string) {
  const message = await prisma.outboundMessage.findUnique({
    where: { unsubscribeToken: token },
  });

  if (!message) {
    return null;
  }

  await createSuppressionFromEvent(
    message.leadId,
    message.campaignId,
    message.mailboxId,
    "UNSUBSCRIBED",
    "app:unsubscribe",
  );
  await stopLeadInCampaign(message.leadId, message.campaignId, "Unsubscribed");

  return message;
}
