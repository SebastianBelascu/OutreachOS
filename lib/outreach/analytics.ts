import { prisma } from "@/lib/prisma";
import { countMailboxSentToday, getMailboxRampCap } from "@/lib/outreach/mailboxes";
import type {
  AnalyticsSnapshot,
  AppWorkspaceStats,
  CampaignProgressSnapshot,
  CommandCenterSnapshot,
  DailySendingPoint,
  DeliverabilityAlert,
  DomainReadinessPoint,
  FunnelPoint,
  InboxCapacityPoint,
  SetupStep,
  VariantPerformanceRow,
} from "@/lib/outreach/types";

function rate(part: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return (part / total) * 100;
}

export async function getWorkspaceStats(): Promise<AppWorkspaceStats> {
  const [leads, activeCampaigns, activeMailboxes, scheduledMessages] = await Promise.all([
    prisma.lead.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.mailbox.count({ where: { isActive: true } }),
    prisma.outboundMessage.count({
      where: {
        status: {
          in: ["SCHEDULED", "CLAIMED"],
        },
      },
    }),
  ]);

  return {
    leads,
    activeCampaigns,
    activeMailboxes,
    scheduledMessages,
  };
}

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const [
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    unsubscribed,
    activeCampaigns,
    totalLeads,
  ] = await Promise.all([
    prisma.outboundMessage.count({ where: { status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] } } }),
    prisma.outboundMessage.count({ where: { status: { in: ["DELIVERED", "OPENED", "CLICKED"] } } }),
    prisma.outboundMessage.count({ where: { status: { in: ["OPENED", "CLICKED"] } } }),
    prisma.outboundMessage.count({ where: { status: "CLICKED" } }),
    prisma.outboundMessage.count({ where: { status: "BOUNCED" } }),
    prisma.suppressionEntry.count({ where: { reason: "UNSUBSCRIBED" } }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.lead.count(),
  ]);

  return {
    totals: {
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      activeCampaigns,
      totalLeads,
    },
    rates: {
      deliveryRate: rate(delivered, sent),
      openRate: rate(opened, delivered),
      clickRate: rate(clicked, opened),
      bounceRate: rate(bounced, sent),
      unsubscribeRate: rate(unsubscribed, sent),
    },
  };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function lastDays(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (count - index - 1));
    return date;
  });
}

function isMailboxReady(mailbox: {
  isActive: boolean;
  healthStatus: string;
  warmupState: string;
  domain: { status: string } | null;
}) {
  return (
    mailbox.isActive &&
    ["HEALTHY", "WARNING"].includes(mailbox.healthStatus) &&
    mailbox.warmupState !== "PAUSED" &&
    (!mailbox.domain || mailbox.domain.status === "READY")
  );
}

export async function getDailySendingSeries(days = 14): Promise<DailySendingPoint[]> {
  const dates = lastDays(days);
  const start = dates[0] ?? new Date();
  const messages = await prisma.outboundMessage.findMany({
    where: {
      OR: [
        { sentAt: { gte: start } },
        { deliveredAt: { gte: start } },
        { openedAt: { gte: start } },
        { clickedAt: { gte: start } },
        { failedAt: { gte: start } },
      ],
    },
    select: {
      status: true,
      sentAt: true,
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
      failedAt: true,
    },
  });

  const points = new Map(
    dates.map((date) => [
      dayKey(date),
      {
        date: dayKey(date),
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
      } satisfies DailySendingPoint,
    ]),
  );

  for (const message of messages) {
    const sentKey = message.sentAt ? dayKey(message.sentAt) : null;
    if (sentKey && points.has(sentKey)) points.get(sentKey)!.sent += 1;
    const deliveredKey = message.deliveredAt ? dayKey(message.deliveredAt) : null;
    if (deliveredKey && points.has(deliveredKey)) points.get(deliveredKey)!.delivered += 1;
    const openedKey = message.openedAt ? dayKey(message.openedAt) : null;
    if (openedKey && points.has(openedKey)) points.get(openedKey)!.opened += 1;
    const clickedKey = message.clickedAt ? dayKey(message.clickedAt) : null;
    if (clickedKey && points.has(clickedKey)) points.get(clickedKey)!.clicked += 1;
    const failedKey = message.failedAt ? dayKey(message.failedAt) : null;
    if (failedKey && points.has(failedKey)) {
      if (message.status === "BOUNCED") {
        points.get(failedKey)!.bounced += 1;
      } else {
        points.get(failedKey)!.failed += 1;
      }
    }
  }

  return [...points.values()];
}

export async function getOutreachFunnel(): Promise<FunnelPoint[]> {
  const [totalLeads, enrolled, scheduled, sent, delivered, opened, clicked, bounced] = await Promise.all([
    prisma.lead.count(),
    prisma.campaignEnrollment.count(),
    prisma.outboundMessage.count({ where: { status: { in: ["SCHEDULED", "CLAIMED"] } } }),
    prisma.outboundMessage.count({ where: { status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] } } }),
    prisma.outboundMessage.count({ where: { status: { in: ["DELIVERED", "OPENED", "CLICKED"] } } }),
    prisma.outboundMessage.count({ where: { status: { in: ["OPENED", "CLICKED"] } } }),
    prisma.outboundMessage.count({ where: { status: "CLICKED" } }),
    prisma.outboundMessage.count({ where: { status: "BOUNCED" } }),
  ]);

  return [
    { stage: "Leads", value: totalLeads },
    { stage: "Enrolled", value: enrolled },
    { stage: "Queued", value: scheduled },
    { stage: "Sent", value: sent },
    { stage: "Delivered", value: delivered },
    { stage: "Opened", value: opened },
    { stage: "Clicked", value: clicked },
    { stage: "Bounced", value: bounced },
  ];
}

export async function getInboxCapacity(): Promise<InboxCapacityPoint[]> {
  const mailboxes = await prisma.mailbox.findMany({
    include: {
      domain: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const points = await Promise.all(
    mailboxes.map(async (mailbox) => {
      const cap = getMailboxRampCap(mailbox);
      const used = await countMailboxSentToday(mailbox.id, mailbox.timezone);
      return {
        inbox: mailbox.fromEmail,
        used,
        remaining: Math.max(0, cap - used),
        cap,
        health: isMailboxReady(mailbox) ? "Ready" : "Blocked",
      };
    }),
  );

  return points;
}

export async function getDomainReadiness(): Promise<DomainReadinessPoint[]> {
  const domains = await prisma.sendingDomain.findMany({
    include: {
      mailboxes: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return domains.map((domain) => ({
    domain: domain.domain,
    ready: domain.status === "READY" ? domain.mailboxes.length : 0,
    blocked: domain.status === "READY" ? 0 : Math.max(1, domain.mailboxes.length),
    status: domain.status,
  }));
}

export async function getCommandCenterSnapshot(): Promise<CommandCenterSnapshot> {
  const [domains, mailboxes, campaigns, leads] = await Promise.all([
    prisma.sendingDomain.findMany({ include: { mailboxes: true } }),
    prisma.mailbox.findMany({ include: { domain: true } }),
    prisma.campaign.findMany({
      include: {
        steps: true,
        enrollments: true,
        mailboxPool: {
          include: {
            mailbox: {
              include: {
                domain: true,
              },
            },
          },
        },
        messages: {
          where: { status: { in: ["SCHEDULED", "CLAIMED"] } },
        },
      },
    }),
    prisma.lead.count(),
  ]);

  const readyDomains = domains.filter((domain) => domain.status === "READY");
  const readyMailboxes = mailboxes.filter(isMailboxReady);
  const campaignWithSequence = campaigns.some((campaign) => campaign.steps.length > 0);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "ACTIVE");
  const sendingCampaigns = campaigns.filter((campaign) => campaign.messages.length > 0);

  const setupSteps: SetupStep[] = [
    {
      key: "domains",
      label: "Domain ready",
      description: "Ai cel putin un domeniu verificat pentru outreach.",
      complete: readyDomains.length > 0,
      href: "/domains",
      actionLabel: "Add / verify domain",
    },
    {
      key: "mailboxes",
      label: "Inbox ready",
      description: "Ai cel putin un inbox healthy care poate intra in rotation.",
      complete: readyMailboxes.length > 0,
      href: "/mailboxes",
      actionLabel: "Fix mailbox",
    },
    {
      key: "leads",
      label: "Leads imported",
      description: "Ai leaduri in baza canonica.",
      complete: leads > 0,
      href: "/leads",
      actionLabel: "Import leads",
    },
    {
      key: "sequence",
      label: "Sequence built",
      description: "Ai cel putin o campanie cu email step.",
      complete: campaignWithSequence,
      href: "/campaigns",
      actionLabel: "Build sequence",
    },
    {
      key: "launch",
      label: "Campaign sending",
      description: "Ai campanie activa sau mesaje queued pentru cron.",
      complete: activeCampaigns.length > 0 || sendingCampaigns.length > 0,
      href: "/campaigns",
      actionLabel: "Launch campaign",
    },
  ];

  const capacityPoints = await Promise.all(
    readyMailboxes.map(async (mailbox) => {
      const cap = getMailboxRampCap(mailbox);
      const used = await countMailboxSentToday(mailbox.id, mailbox.timezone);
      return { cap, used };
    }),
  );
  const capacityTotal = capacityPoints.reduce((sum, point) => sum + point.cap, 0);
  const capacityUsed = capacityPoints.reduce((sum, point) => sum + point.used, 0);
  const completedSteps = setupSteps.filter((step) => step.complete).length;

  return {
    readinessScore: Math.round((completedSteps / setupSteps.length) * 100),
    setupSteps,
    nextAction: setupSteps.find((step) => !step.complete) ?? setupSteps[setupSteps.length - 1],
    capacityToday: {
      total: capacityTotal,
      used: capacityUsed,
      available: Math.max(0, capacityTotal - capacityUsed),
    },
    blockers: {
      domains: domains.filter((domain) => domain.status !== "READY").length,
      mailboxes: mailboxes.filter((mailbox) => !isMailboxReady(mailbox)).length,
      campaigns: campaigns.filter((campaign) => campaign.status !== "ACTIVE" && campaign.enrollments.length > 0).length,
    },
  };
}

export async function getVariantPerformance(campaignId: string): Promise<VariantPerformanceRow[]> {
  const [steps, messages, replies] = await Promise.all([
    prisma.sequenceStep.findMany({
      where: { campaignId },
      orderBy: { stepOrder: "asc" },
      include: { variants: { orderBy: { label: "asc" } } },
    }),
    prisma.outboundMessage.findMany({
      where: { campaignId },
      select: { id: true, sequenceStepId: true, variantId: true, sentAt: true, openedAt: true, clickedAt: true },
    }),
    prisma.inboundMessage.findMany({
      where: { campaignId, direction: "INBOUND", outboundMessageId: { not: null } },
      select: { outboundMessageId: true },
    }),
  ]);

  const repliedIds = new Set(replies.map((reply) => reply.outboundMessageId));
  const rows = new Map<string, VariantPerformanceRow>();

  const keyFor = (sequenceStepId: string, variantId: string | null) => `${sequenceStepId}:${variantId ?? "base"}`;

  // Seed a row per step's base copy + each defined variant, so zero-send variants still show.
  for (const step of steps) {
    rows.set(keyFor(step.id, null), {
      sequenceStepId: step.id,
      stepOrder: step.stepOrder,
      variantId: null,
      label: step.variants.length > 0 ? "Base" : "—",
      sent: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
    });
    for (const variant of step.variants) {
      rows.set(keyFor(step.id, variant.id), {
        sequenceStepId: step.id,
        stepOrder: step.stepOrder,
        variantId: variant.id,
        label: variant.label,
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
      });
    }
  }

  for (const message of messages) {
    const row = rows.get(keyFor(message.sequenceStepId, message.variantId));
    if (!row) {
      continue;
    }
    if (message.sentAt) row.sent += 1;
    if (message.openedAt) row.opened += 1;
    if (message.clickedAt) row.clicked += 1;
    if (repliedIds.has(message.id)) row.replied += 1;
  }

  return [...rows.values()].sort((left, right) =>
    left.stepOrder === right.stepOrder
      ? left.label.localeCompare(right.label)
      : left.stepOrder - right.stepOrder,
  );
}

export async function getReplyTotals() {
  const [total, unread, sent] = await Promise.all([
    prisma.inboundMessage.count({ where: { direction: "INBOUND" } }),
    prisma.inboundMessage.count({ where: { direction: "INBOUND", isRead: false, isArchived: false } }),
    prisma.outboundMessage.count({ where: { status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] } } }),
  ]);
  return { total, unread, replyRate: rate(total, sent) };
}

export async function getDeliverabilityAlerts(): Promise<DeliverabilityAlert[]> {
  const [mailboxes, campaigns, domains] = await Promise.all([
    prisma.mailbox.findMany({
      where: { healthStatus: { in: ["WARNING", "UNHEALTHY"] } },
      select: { id: true, name: true, fromEmail: true, healthStatus: true },
    }),
    prisma.campaign.findMany({
      where: { status: "PAUSED", pausedReason: { not: null } },
      select: { id: true, name: true, pausedReason: true },
    }),
    prisma.sendingDomain.findMany({
      where: { status: "RISK" },
      select: { id: true, domain: true },
    }),
  ]);

  const alerts: DeliverabilityAlert[] = [];

  for (const mailbox of mailboxes) {
    alerts.push({
      kind: "mailbox",
      severity: mailbox.healthStatus === "UNHEALTHY" ? "critical" : "warning",
      label: mailbox.fromEmail,
      detail:
        mailbox.healthStatus === "UNHEALTHY"
          ? "Auto-paused — bounce/complaint rate over the safe threshold."
          : "Elevated bounce rate — watch this inbox.",
      href: "/mailboxes",
    });
  }

  for (const campaign of campaigns) {
    alerts.push({
      kind: "campaign",
      severity: "critical",
      label: campaign.name,
      detail: campaign.pausedReason ?? "Campaign paused.",
      href: `/campaigns/${campaign.id}`,
    });
  }

  for (const domain of domains) {
    alerts.push({
      kind: "domain",
      severity: "warning",
      label: domain.domain,
      detail: "DNS check regressed — re-verify SPF/DKIM/DMARC.",
      href: "/domains",
    });
  }

  return alerts;
}

export function getCampaignProgressSnapshot(campaign: {
  status: string;
  steps: unknown[];
  enrollments: unknown[];
  messages: Array<{ status: string }>;
  mailboxPool: Array<{
    isActive: boolean;
    mailbox: {
      isActive: boolean;
      healthStatus: string;
      warmupState: string;
      domain: { status: string } | null;
    };
  }>;
}): CampaignProgressSnapshot {
  const readyMailboxes = campaign.mailboxPool.filter((entry) => entry.isActive && isMailboxReady(entry.mailbox));
  const sequenceReady = campaign.steps.length > 0;
  const leadsReady = campaign.enrollments.length > 0;
  const launchReady = campaign.status === "ACTIVE" && readyMailboxes.length > 0;
  const sendingStarted = campaign.messages.some((message) =>
    ["CLAIMED", "SENT", "DELIVERED", "OPENED", "CLICKED"].includes(message.status),
  );
  const checks = [sequenceReady, leadsReady, launchReady, sendingStarted];
  const blockers = [
    !sequenceReady ? "Add at least one sequence step." : null,
    !leadsReady ? "Enroll leads into this campaign." : null,
    readyMailboxes.length === 0 ? "Add one ready inbox to the mailbox pool." : null,
    campaign.status !== "ACTIVE" ? "Activate the campaign from Launch." : null,
  ].filter(Boolean) as string[];

  return {
    sequenceReady,
    leadsReady,
    launchReady,
    sendingStarted,
    progressPercent: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    blockers,
  };
}
