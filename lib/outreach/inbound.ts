import { Prisma, type InboundClassification, type LeadStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { classifyInboundWithAi, isAiConfigured } from "@/lib/outreach/ai";
import { stopLeadInCampaign } from "@/lib/outreach/campaigns";
import { classifyInbound } from "@/lib/outreach/classify";
import { buildEventKey, normalizeEmail, textFromHtml } from "@/lib/outreach/format";

export interface RawInboundMessage {
  mailboxId: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string[];
  fromEmail: string;
  fromName?: string | null;
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string | undefined>;
  receivedAt: Date;
}

const REPLY_MARKERS = [
  /^-{2,}\s*original message\s*-{2,}/i,
  /^on .+ wrote:$/i,
  /^on .+, .+ <.+@.+> wrote:$/i,
  /^in data de .+ a scris:$/i,
  /^pe .+ a scris:$/i,
  /^from:\s.+/i,
  /^de la:\s.+/i,
  /^sent:\s.+/i,
  /^>.*$/,
];

/**
 * Strips quoted history and signatures from a reply, leaving the new content.
 * Pure code — no external services.
 */
export function cleanReplyText(rawText?: string | null, rawHtml?: string | null) {
  const base = (rawText && rawText.trim().length > 0 ? rawText : textFromHtml(rawHtml ?? "")) ?? "";
  const lines = base.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Signature delimiter — drop everything after it.
    if (trimmed === "--" || trimmed === "-- ") {
      break;
    }
    // Quoted-history marker — the rest is the previous message.
    if (REPLY_MARKERS.some((pattern) => pattern.test(trimmed))) {
      break;
    }
    kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim() || base.trim();
}

async function matchOutbound(raw: RawInboundMessage) {
  const rawRefs = [raw.inReplyTo, ...(raw.references ?? [])].filter(
    (value): value is string => Boolean(value),
  );

  // Match with and without angle brackets — providers are inconsistent about them.
  const refs = new Set<string>();
  for (const ref of rawRefs) {
    const stripped = ref.replace(/^<|>$/g, "").trim();
    if (!stripped) {
      continue;
    }
    refs.add(stripped);
    refs.add(`<${stripped}>`);
  }

  if (refs.size > 0) {
    const byHeader = await prisma.outboundMessage.findFirst({
      where: { providerMessageId: { in: [...refs] } },
      orderBy: { sentAt: "desc" },
    });
    if (byHeader) {
      return byHeader;
    }
  }

  // Fallback: most recent sent message to this lead from this mailbox.
  const lead = await prisma.lead.findUnique({
    where: { normalizedEmail: normalizeEmail(raw.fromEmail) },
    select: { id: true },
  });
  if (!lead) {
    return null;
  }

  return prisma.outboundMessage.findFirst({
    where: {
      leadId: lead.id,
      mailboxId: raw.mailboxId,
      status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] },
    },
    orderBy: { sentAt: "desc" },
  });
}

function nextLeadStatus(current: LeadStatus, classification: InboundClassification): LeadStatus | null {
  // Never downgrade a lead that's already further along.
  if (current === "MEETING_BOOKED") {
    return null;
  }

  switch (classification) {
    case "INTERESTED":
      return current === "INTERESTED" ? null : "INTERESTED";
    case "NOT_INTERESTED":
      return current === "NOT_INTERESTED" ? null : "NOT_INTERESTED";
    case "UNSUBSCRIBE_REQUEST":
    case "NEUTRAL":
      return ["NEW", "CONTACTED", "OPENED"].includes(current) ? "REPLIED" : null;
    default:
      return null;
  }
}

const HUMAN_REPLY: InboundClassification[] = ["INTERESTED", "NOT_INTERESTED", "NEUTRAL", "UNSUBSCRIBE_REQUEST"];

/**
 * Ingests one raw inbound email: matches it to an outbound message/lead, cleans and
 * classifies it, persists an InboundMessage row (idempotent), and applies side effects
 * (stop-on-reply, lead status, unsubscribe suppression). Returns the stored row, or the
 * existing one if this message was already ingested.
 */
export async function ingestInboundMessage(raw: RawInboundMessage) {
  const outbound = await matchOutbound(raw);
  const cleanedText = cleanReplyText(raw.text, raw.html);
  const ruleClassification = classifyInbound({
    fromEmail: raw.fromEmail,
    subject: raw.subject,
    text: cleanedText,
    headers: raw.headers,
  });

  // Rules own the reliable, side-effect-bearing buckets (bounce, OOO, auto-reply,
  // unsubscribe). For the fuzzy human-sentiment buckets, let the LLM sharpen the verdict.
  let classification = ruleClassification;
  let classificationSource = "rules";
  if (
    outbound?.leadId &&
    ["INTERESTED", "NOT_INTERESTED", "NEUTRAL"].includes(ruleClassification) &&
    isAiConfigured()
  ) {
    const aiClassification = await classifyInboundWithAi({ subject: raw.subject, text: cleanedText });
    if (aiClassification) {
      classification = aiClassification;
      classificationSource = "openai";
    }
  }

  let inbound;
  try {
    inbound = await prisma.inboundMessage.create({
      data: {
        mailboxId: raw.mailboxId,
        leadId: outbound?.leadId ?? null,
        campaignId: outbound?.campaignId ?? null,
        enrollmentId: outbound?.enrollmentId ?? null,
        outboundMessageId: outbound?.id ?? null,
        messageId: raw.messageId,
        inReplyTo: raw.inReplyTo ?? null,
        referencesHeader: raw.references?.join(" ") ?? null,
        fromEmail: normalizeEmail(raw.fromEmail),
        fromName: raw.fromName ?? null,
        subject: raw.subject ?? null,
        rawHtml: raw.html ?? null,
        rawText: raw.text ?? null,
        cleanedText,
        snippet: cleanedText.slice(0, 140),
        classification,
        classificationSource,
        receivedAt: raw.receivedAt,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.inboundMessage.findUnique({
        where: { mailboxId_messageId: { mailboxId: raw.mailboxId, messageId: raw.messageId } },
      });
    }
    throw error;
  }

  // Bounce notifications (mailer-daemon) — the only bounce signal for SMTP-sent mail,
  // which has no Brevo webhook. Guard against double-handling Brevo bounces.
  if (outbound && classification === "BOUNCE_NOTIFICATION" && !["BOUNCED", "SUPPRESSED"].includes(outbound.status)) {
    await prisma.outboundMessage.update({
      where: { id: outbound.id },
      data: { status: "BOUNCED", failedAt: new Date(), failureReason: "Bounced (mailer-daemon)" },
    });
    await prisma.lead.update({ where: { id: outbound.leadId }, data: { status: "BOUNCED" } });
    await prisma.suppressionEntry.create({
      data: {
        leadId: outbound.leadId,
        campaignId: outbound.campaignId,
        mailboxId: outbound.mailboxId,
        reason: "HARD_BOUNCE",
        source: "imap:bounce",
      },
    });
    // Record a HARD_BOUNCE event so mailbox/campaign health (which reads EmailEvent)
    // actually reacts to SMTP bounces — Brevo webhooks never fire for SMTP-sent mail.
    try {
      await prisma.emailEvent.create({
        data: {
          eventKey: buildEventKey("HARD_BOUNCE", outbound.id, raw.messageId),
          eventType: "HARD_BOUNCE",
          providerMessageId: outbound.providerMessageId ?? null,
          payload: { source: "imap:bounce", bounceFrom: raw.fromEmail } as unknown as Prisma.InputJsonValue,
          occurredAt: raw.receivedAt,
          outboundMessageId: outbound.id,
          campaignId: outbound.campaignId,
          leadId: outbound.leadId,
        },
      });
    } catch (error) {
      // Duplicate event for a re-ingested bounce — safe to ignore.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
    await stopLeadInCampaign(outbound.leadId, outbound.campaignId, "Hard bounce");
  }

  // Side effects only when we matched a real enrolled lead.
  if (outbound?.leadId && outbound.campaignId) {
    if (HUMAN_REPLY.includes(classification)) {
      // Enforces stopOnReply — cancels pending messages and stops the enrollment.
      await stopLeadInCampaign(outbound.leadId, outbound.campaignId, "Replied");
    }

    if (classification === "UNSUBSCRIBE_REQUEST") {
      await prisma.suppressionEntry.create({
        data: {
          leadId: outbound.leadId,
          campaignId: outbound.campaignId,
          mailboxId: outbound.mailboxId,
          reason: "UNSUBSCRIBED",
          source: "imap:reply",
        },
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: outbound.leadId },
      select: { status: true },
    });
    if (lead) {
      const status = nextLeadStatus(lead.status, classification);
      if (status) {
        await prisma.lead.update({ where: { id: outbound.leadId }, data: { status } });
      }
    }
  }

  return inbound;
}
