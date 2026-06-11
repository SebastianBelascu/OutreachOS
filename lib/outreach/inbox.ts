import { Prisma, type InboundClassification } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { textFromHtml } from "@/lib/outreach/format";

export interface InboxFilters {
  mailboxId?: string;
  campaignId?: string;
  classification?: InboundClassification;
  unreadOnly?: boolean;
  search?: string;
}

export async function listInbox(filters: InboxFilters = {}) {
  const where: Prisma.InboundMessageWhereInput = { direction: "INBOUND", isArchived: false };

  if (filters.mailboxId && filters.mailboxId !== "ALL") {
    where.mailboxId = filters.mailboxId;
  }
  if (filters.campaignId && filters.campaignId !== "ALL") {
    where.campaignId = filters.campaignId;
  }
  if (filters.classification) {
    where.classification = filters.classification;
  }
  if (filters.unreadOnly) {
    where.isRead = false;
  }
  if (filters.search && filters.search.trim().length > 0) {
    where.OR = [
      { fromEmail: { contains: filters.search, mode: "insensitive" } },
      { subject: { contains: filters.search, mode: "insensitive" } },
      { snippet: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.inboundMessage.findMany({
    where,
    include: {
      mailbox: { select: { id: true, fromEmail: true, name: true } },
      lead: { select: { id: true, company: true, email: true, status: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });
}

export async function unreadInboxCount() {
  return prisma.inboundMessage.count({
    where: { direction: "INBOUND", isRead: false, isArchived: false },
  });
}

export interface ThreadItem {
  kind: "outbound" | "inbound";
  id: string;
  at: Date;
  subject: string | null;
  body: string;
  fromLabel: string;
  classification?: InboundClassification;
}

/**
 * Returns the full conversation around an inbound message: every outbound message and
 * inbound reply for the same lead + campaign, merged chronologically.
 */
export async function getThread(inboundMessageId: string) {
  const inbound = await prisma.inboundMessage.findUnique({
    where: { id: inboundMessageId },
    include: {
      mailbox: { select: { id: true, fromEmail: true, name: true } },
      lead: { select: { id: true, company: true, email: true, status: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  if (!inbound) {
    return null;
  }

  const items: ThreadItem[] = [];

  if (inbound.leadId && inbound.campaignId) {
    const [outbound, inboundMessages] = await Promise.all([
      prisma.outboundMessage.findMany({
        where: { leadId: inbound.leadId, campaignId: inbound.campaignId, sentAt: { not: null } },
        include: { mailbox: { select: { fromEmail: true } } },
        orderBy: { sentAt: "asc" },
      }),
      prisma.inboundMessage.findMany({
        where: { leadId: inbound.leadId, campaignId: inbound.campaignId },
        orderBy: { receivedAt: "asc" },
      }),
    ]);

    for (const message of outbound) {
      items.push({
        kind: "outbound",
        id: message.id,
        at: message.sentAt ?? message.createdAt,
        subject: message.subject,
        body: textFromHtml(message.htmlBody),
        fromLabel: message.mailbox.fromEmail,
      });
    }
    for (const message of inboundMessages) {
      items.push({
        kind: message.direction === "OUTBOUND_REPLY" ? "outbound" : "inbound",
        id: message.id,
        at: message.receivedAt,
        subject: message.subject,
        body: message.cleanedText ?? message.rawText ?? "",
        fromLabel: message.direction === "OUTBOUND_REPLY" ? inbound.mailbox.fromEmail : message.fromEmail,
        classification: message.direction === "OUTBOUND_REPLY" ? undefined : message.classification,
      });
    }
  } else {
    items.push({
      kind: "inbound",
      id: inbound.id,
      at: inbound.receivedAt,
      subject: inbound.subject,
      body: inbound.cleanedText ?? inbound.rawText ?? "",
      fromLabel: inbound.fromEmail,
      classification: inbound.classification,
    });
  }

  items.sort((left, right) => left.at.getTime() - right.at.getTime());

  return { inbound, items };
}
