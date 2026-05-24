import { prisma } from "@/lib/prisma";
import type { AnalyticsSnapshot, AppWorkspaceStats } from "@/lib/outreach/types";

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
