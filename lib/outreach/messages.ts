import { Prisma, type MessageEventType, type MessageStatus, type SuppressionReason } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCampaignEffectiveDailyLimit, stopLeadInCampaign } from "@/lib/outreach/campaigns";
import {
  BrevoSendError,
  mapBrevoEventType,
  sendBrevoTransactionalEmail,
  type BrevoTransactionalWebhookPayload,
} from "@/lib/outreach/brevo";
import {
  backoffScheduledAt,
  buildEventKey,
  getDatePartsInTimeZone,
  isWithinSendWindow,
  randomBetween,
  sleep,
} from "@/lib/outreach/format";
import { evaluateCampaignHealth, evaluateMailboxHealth } from "@/lib/outreach/health";
import {
  countMailboxSentThisHour,
  countMailboxSentToday,
  getMailboxRampCap,
  usageDateForMailbox,
} from "@/lib/outreach/mailboxes";
import { SmtpSendError, isSmtpConfigured, sendViaSmtp } from "@/lib/outreach/smtp";
import type { DispatchSummary, SendSummary, SendWindow } from "@/lib/outreach/types";
import { absoluteUrl } from "@/lib/utils";

const MAX_SOFT_RETRIES = 3;

function parseWindow(value: Prisma.JsonValue) {
  const candidate = value as unknown as Partial<SendWindow>;
  return {
    days: candidate.days ?? [1, 2, 3, 4, 5],
    startHour: candidate.startHour ?? 9,
    endHour: candidate.endHour ?? 17,
  };
}

type DispatchCandidate = Prisma.OutboundMessageGetPayload<{
  include: {
    campaign: {
      include: {
        mailboxPool: {
          include: {
            mailbox: {
              include: {
                domain: true;
              };
            };
          };
        };
      };
    };
    mailbox: {
      include: {
        domain: true;
      };
    };
    lead: {
      include: {
        suppressions: true;
      };
    };
  };
}>;

async function countCampaignDeliveriesToday(campaignId: string, timezone: string, now = new Date()) {
  const parts = getDatePartsInTimeZone(now, timezone);
  const start = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0));
  const end = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0));

  return prisma.outboundMessage.count({
    where: {
      campaignId,
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

async function chooseEligibleMailbox(message: DispatchCandidate, now: Date) {
  const campaign = message.campaign;
  const fallbackMailbox = message.mailbox;
  const pool = campaign.mailboxPool?.length
    ? campaign.mailboxPool
    : [{ isActive: true, weight: 1, mailbox: fallbackMailbox }];
  const campaignSendCount = await countCampaignDeliveriesToday(message.campaignId, campaign.timezone, now);
  const campaignDailyLimit = getCampaignEffectiveDailyLimit(campaign, now);

  if (campaignSendCount >= campaignDailyLimit) {
    return null;
  }

  const campaignWindow = parseWindow(campaign.sendWindow);
  if (!isWithinSendWindow(now, campaign.timezone, campaignWindow)) {
    return null;
  }

  const candidates = [];
  for (const entry of pool) {
    const mailbox = entry.mailbox;
    const mailboxWindow = parseWindow(mailbox.sendWindow);
    const domainReady = !mailbox.domain || mailbox.domain.status === "READY";
    const mailboxReady =
      entry.isActive &&
      mailbox.isActive &&
      domainReady &&
      mailbox.warmupState !== "PAUSED" &&
      ["HEALTHY", "WARNING"].includes(mailbox.healthStatus) &&
      isWithinSendWindow(now, mailbox.timezone, mailboxWindow);

    if (!mailboxReady) {
      continue;
    }

    const sentThisHour = await countMailboxSentThisHour(mailbox.id, now);
    if (sentThisHour >= mailbox.hourlyCap) {
      continue;
    }

    const sentToday = await countMailboxSentToday(mailbox.id, mailbox.timezone, now);
    const effectiveCap = Math.min(getMailboxRampCap(mailbox, now), campaignDailyLimit);
    const remaining = effectiveCap - sentToday;

    if (remaining <= 0) {
      continue;
    }

    candidates.push({
      mailbox,
      score: remaining * Math.max(1, entry.weight ?? mailbox.rotationWeight ?? 1),
    });
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.mailbox ?? null;
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
      campaign: {
        include: {
          mailboxPool: {
            where: { isActive: true },
            include: {
              mailbox: {
                include: {
                  domain: true,
                },
              },
            },
          },
        },
      },
      mailbox: {
        include: {
          domain: true,
        },
      },
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

    const selectedMailbox = await chooseEligibleMailbox(message, now);

    if (!selectedMailbox) {
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
        mailboxId: selectedMailbox.id,
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

export async function sendClaimedMessages(limit = 8): Promise<SendSummary> {
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
  let retriedCount = 0;
  let skippedCount = 0;

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];

    // Humanize cadence: jitter between consecutive sends to avoid burst patterns.
    if (index > 0) {
      await sleep(randomBetween(4000, 20000));
    }

    try {
      const unsubscribeUrl = absoluteUrl(`/unsubscribe/${message.unsubscribeToken}`);
      const leadName = `${message.lead.firstName ?? ""} ${message.lead.lastName ?? ""}`.trim() || undefined;
      const headers = {
        "X-OutreachOS-Message-ID": message.id,
        "X-OutreachOS-Campaign-ID": message.campaignId,
        "X-OutreachOS-Lead-ID": message.leadId,
        "X-OutreachOS-Step-ID": message.sequenceStepId,
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };

      // Route through the mailbox's own SMTP server when configured (sends with the
      // inbox's warmed reputation); otherwise fall back to the Brevo transactional API.
      const useSmtp = message.mailbox.sendTransport === "SMTP" && isSmtpConfigured(message.mailbox);
      const response = useSmtp
        ? await sendViaSmtp({
            mailbox: message.mailbox,
            to: { email: message.lead.email, name: leadName },
            subject: message.subject,
            html: message.htmlBody,
            headers,
          })
        : await sendBrevoTransactionalEmail({
            sender: { email: message.mailbox.fromEmail, name: message.mailbox.fromName },
            replyTo: message.mailbox.replyTo ? { email: message.mailbox.replyTo } : undefined,
            to: [{ email: message.lead.email, name: leadName }],
            subject: message.subject,
            htmlContent: message.htmlBody,
            tags: message.tags,
            headers,
          });

      await prisma.outboundMessage.update({
        where: { id: message.id },
        data: {
          status: "SENT",
          providerMessageId: response.messageId,
          sentAt: new Date(),
          threadRef: response.messageId,
          nextRetryAt: null,
          failureReason: null,
        },
      });

      await prisma.mailboxDailyUsage.upsert({
        where: {
          mailboxId_usageDate: {
            mailboxId: message.mailboxId,
            usageDate: usageDateForMailbox(new Date(), message.mailbox.timezone),
          },
        },
        update: {
          sentCount: {
            increment: 1,
          },
        },
        create: {
          mailboxId: message.mailboxId,
          usageDate: usageDateForMailbox(new Date(), message.mailbox.timezone),
          sentCount: 1,
        },
      });

      await prisma.lead.update({
        where: { id: message.leadId },
        data: { status: "CONTACTED" },
      });

      sentCount += 1;
    } catch (error) {
      const transient =
        (error instanceof BrevoSendError && error.retryable) ||
        (error instanceof SmtpSendError && error.retryable);
      const reason = error instanceof Error ? error.message : "Unknown send failure";

      if (transient && message.retryCount < MAX_SOFT_RETRIES) {
        const nextAt = backoffScheduledAt(message.retryCount);
        await prisma.outboundMessage.update({
          where: { id: message.id },
          data: {
            status: "SCHEDULED",
            scheduledAt: nextAt,
            nextRetryAt: nextAt,
            retryCount: { increment: 1 },
            failureReason: reason,
          },
        });
        retriedCount += 1;
      } else {
        failedCount += 1;
        await prisma.outboundMessage.update({
          where: { id: message.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            retryCount: { increment: 1 },
            failureReason: reason,
          },
        });
      }
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
        retriedCount,
        skippedCount,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    sentCount,
    failedCount,
    retriedCount,
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

  let eventRecord;
  try {
    eventRecord = await prisma.emailEvent.create({
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
  } catch (error) {
    // Concurrent delivery of the same event — treat as already processed.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.emailEvent.findUnique({ where: { eventKey } });
    }
    throw error;
  }

  if (!outboundMessage) {
    return eventRecord;
  }

  const softRetryable = ["SOFT_BOUNCE", "DEFERRED", "ERROR"].includes(eventType);
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

  if (softRetryable && outboundMessage.retryCount < MAX_SOFT_RETRIES) {
    // Temporary failure — reschedule with backoff instead of giving up.
    const nextAt = backoffScheduledAt(outboundMessage.retryCount, occurredAt);
    nextData.status = "SCHEDULED" as never;
    nextData.scheduledAt = nextAt;
    nextData.nextRetryAt = nextAt;
    nextData.retryCount = { increment: 1 };
    nextData.failureReason = payload.reason ? String(payload.reason) : eventType;
  } else if (["SOFT_BOUNCE", "HARD_BOUNCE", "INVALID", "DEFERRED", "ERROR"].includes(eventType)) {
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

  // Near-real-time guardrail: re-check the affected mailbox/campaign on bounce/complaint
  // so a deteriorating inbox is paused before the next hourly sweep.
  if (["HARD_BOUNCE", "SOFT_BOUNCE", "COMPLAINT"].includes(eventType)) {
    try {
      await evaluateMailboxHealth(outboundMessage.mailboxId);
      await evaluateCampaignHealth(outboundMessage.campaignId);
    } catch {
      // Guardrail evaluation is best-effort; never fail the webhook over it.
    }
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
