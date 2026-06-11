import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getOptionalEnv } from "@/lib/env";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const BOUNCE_EVENT_TYPES = ["HARD_BOUNCE", "SOFT_BOUNCE", "INVALID"] as const;

export interface HealthEvaluation {
  mailboxesChecked: number;
  mailboxesPaused: number;
  mailboxesWarned: number;
  campaignsChecked: number;
  campaignsPaused: number;
  details: Array<{
    kind: "mailbox" | "campaign";
    id: string;
    name: string;
    sent: number;
    bounceRate: number;
    complaintRate: number;
    action: "paused" | "warned" | "ok";
  }>;
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

async function mailboxWindowStats(mailboxId: string, since: Date) {
  const [sent, bounced, complaints] = await Promise.all([
    prisma.outboundMessage.count({
      where: { mailboxId, sentAt: { gte: since } },
    }),
    prisma.emailEvent.count({
      where: {
        eventType: { in: [...BOUNCE_EVENT_TYPES] },
        occurredAt: { gte: since },
        outboundMessage: { mailboxId },
      },
    }),
    prisma.emailEvent.count({
      where: {
        eventType: "COMPLAINT",
        occurredAt: { gte: since },
        outboundMessage: { mailboxId },
      },
    }),
  ]);

  return { sent, bounced, complaints };
}

async function campaignWindowStats(campaignId: string, since: Date) {
  const [sent, bounced, complaints] = await Promise.all([
    prisma.outboundMessage.count({
      where: { campaignId, sentAt: { gte: since } },
    }),
    prisma.emailEvent.count({
      where: {
        campaignId,
        eventType: { in: [...BOUNCE_EVENT_TYPES] },
        occurredAt: { gte: since },
      },
    }),
    prisma.emailEvent.count({
      where: { campaignId, eventType: "COMPLAINT", occurredAt: { gte: since } },
    }),
  ]);

  return { sent, bounced, complaints };
}

/**
 * Evaluates a single mailbox and demotes/pauses it if its trailing-7-day bounce or
 * complaint rate breaches the guardrail thresholds. Only demotes — never auto-heals.
 */
export async function evaluateMailboxHealth(mailboxId: string, now = new Date()) {
  const env = getOptionalEnv();
  const since = new Date(now.getTime() - WEEK_MS);
  const mailbox = await prisma.mailbox.findUnique({
    where: { id: mailboxId },
    select: { id: true, name: true, healthStatus: true, isActive: true },
  });

  if (!mailbox) {
    return null;
  }

  const stats = await mailboxWindowStats(mailboxId, since);
  const bounceRate = rate(stats.bounced, stats.sent);
  const complaintRate = rate(stats.complaints, stats.sent);

  let action: "paused" | "warned" | "ok" = "ok";

  if (stats.sent >= env.guardrailMinVolume) {
    if (bounceRate >= env.guardrailBounceRate || complaintRate >= env.guardrailComplaintRate) {
      if (mailbox.healthStatus !== "UNHEALTHY" || mailbox.isActive) {
        await prisma.mailbox.update({
          where: { id: mailboxId },
          data: {
            healthStatus: "UNHEALTHY",
            isActive: false,
            imapLastError: null,
          },
        });
      }
      action = "paused";
    } else if (bounceRate >= env.guardrailWarnBounceRate && mailbox.healthStatus === "HEALTHY") {
      await prisma.mailbox.update({
        where: { id: mailboxId },
        data: { healthStatus: "WARNING" },
      });
      action = "warned";
    }
  }

  return {
    kind: "mailbox" as const,
    id: mailbox.id,
    name: mailbox.name,
    sent: stats.sent,
    bounceRate,
    complaintRate,
    action,
  };
}

export async function evaluateCampaignHealth(campaignId: string, now = new Date()) {
  const env = getOptionalEnv();
  const since = new Date(now.getTime() - WEEK_MS);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, status: true },
  });

  if (!campaign) {
    return null;
  }

  const stats = await campaignWindowStats(campaignId, since);
  const bounceRate = rate(stats.bounced, stats.sent);
  const complaintRate = rate(stats.complaints, stats.sent);

  let action: "paused" | "ok" = "ok";

  if (
    stats.sent >= env.guardrailMinVolume &&
    campaign.status === "ACTIVE" &&
    (bounceRate >= env.guardrailBounceRate || complaintRate >= env.guardrailComplaintRate)
  ) {
    const reason =
      bounceRate >= env.guardrailBounceRate
        ? `Auto-paused: bounce rate ${(bounceRate * 100).toFixed(1)}% over the last 7 days.`
        : `Auto-paused: complaint rate ${(complaintRate * 100).toFixed(2)}% over the last 7 days.`;
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "PAUSED", pausedReason: reason },
    });
    action = "paused";
  }

  return {
    kind: "campaign" as const,
    id: campaign.id,
    name: campaign.name,
    sent: stats.sent,
    bounceRate,
    complaintRate,
    action,
  };
}

/** Full sweep over all active mailboxes and active campaigns. Used by the hourly cron. */
export async function evaluateAllHealth(now = new Date()): Promise<HealthEvaluation> {
  const run = await prisma.cronJobRun.create({ data: { jobName: "outreach-health" } });
  const details: HealthEvaluation["details"] = [];

  const mailboxes = await prisma.mailbox.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const campaigns = await prisma.campaign.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  let mailboxesPaused = 0;
  let mailboxesWarned = 0;
  let campaignsPaused = 0;

  for (const mailbox of mailboxes) {
    const result = await evaluateMailboxHealth(mailbox.id, now);
    if (result) {
      details.push(result);
      if (result.action === "paused") mailboxesPaused += 1;
      if (result.action === "warned") mailboxesWarned += 1;
    }
  }

  for (const campaign of campaigns) {
    const result = await evaluateCampaignHealth(campaign.id, now);
    if (result) {
      details.push(result);
      if (result.action === "paused") campaignsPaused += 1;
    }
  }

  const summary: HealthEvaluation = {
    mailboxesChecked: mailboxes.length,
    mailboxesPaused,
    mailboxesWarned,
    campaignsChecked: campaigns.length,
    campaignsPaused,
    details,
  };

  await prisma.cronJobRun.update({
    where: { id: run.id },
    data: {
      status: "SUCCEEDED",
      finishedAt: new Date(),
      summary: summary as unknown as Prisma.InputJsonValue,
    },
  });

  return summary;
}
