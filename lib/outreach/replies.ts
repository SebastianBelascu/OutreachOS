import type { InboundClassification } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendBrevoTransactionalEmail } from "@/lib/outreach/brevo";
import { inboxReplyInputSchema } from "@/lib/outreach/validators";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Sends a manual reply from the Unibox, threaded onto the original message
 * (In-Reply-To / References), and records it as an OUTBOUND_REPLY in the thread.
 */
export async function sendInboxReply(input: unknown) {
  const parsed = inboxReplyInputSchema.parse(input);
  const inbound = await prisma.inboundMessage.findUnique({
    where: { id: parsed.inboundMessageId },
    include: { mailbox: true },
  });

  if (!inbound) {
    throw new Error("Inbound message not found.");
  }

  const mailbox = inbound.mailbox;
  const baseSubject = inbound.subject ?? "";
  const subject = baseSubject.toLowerCase().startsWith("re:") ? baseSubject : `Re: ${baseSubject}`.trim();
  const references = [inbound.referencesHeader, inbound.messageId].filter(Boolean).join(" ").trim();
  const htmlContent = `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#171717">${escapeHtml(parsed.body).replace(/\n/g, "<br />")}</div>`;

  const response = await sendBrevoTransactionalEmail({
    sender: { email: mailbox.fromEmail, name: mailbox.fromName },
    replyTo: mailbox.replyTo ? { email: mailbox.replyTo } : undefined,
    to: [{ email: inbound.fromEmail, name: inbound.fromName ?? undefined }],
    subject,
    htmlContent,
    tags: inbound.campaignId ? ["reply", `campaign:${inbound.campaignId}`] : ["reply"],
    headers: {
      "In-Reply-To": inbound.messageId,
      ...(references ? { References: references } : {}),
    },
  });

  await prisma.inboundMessage.create({
    data: {
      mailboxId: mailbox.id,
      leadId: inbound.leadId,
      campaignId: inbound.campaignId,
      outboundMessageId: inbound.outboundMessageId,
      messageId: response.messageId ?? `reply-${inbound.id}`,
      inReplyTo: inbound.messageId,
      referencesHeader: references || null,
      fromEmail: mailbox.fromEmail,
      fromName: mailbox.fromName,
      subject,
      rawText: parsed.body,
      cleanedText: parsed.body,
      snippet: parsed.body.slice(0, 140),
      classification: "NEUTRAL",
      classificationSource: "manual",
      isRead: true,
      direction: "OUTBOUND_REPLY",
      receivedAt: new Date(),
    },
  });

  // Mark the whole thread read now that we've responded.
  if (inbound.leadId && inbound.campaignId) {
    await prisma.inboundMessage.updateMany({
      where: { leadId: inbound.leadId, campaignId: inbound.campaignId, direction: "INBOUND" },
      data: { isRead: true },
    });
  } else {
    await prisma.inboundMessage.update({ where: { id: inbound.id }, data: { isRead: true } });
  }

  return response;
}

export async function markInboundRead(inboundMessageId: string, isRead: boolean) {
  return prisma.inboundMessage.update({
    where: { id: inboundMessageId },
    data: { isRead },
  });
}

export async function archiveInbound(inboundMessageId: string) {
  return prisma.inboundMessage.update({
    where: { id: inboundMessageId },
    data: { isArchived: true, isRead: true },
  });
}

export async function setInboundClassification(
  inboundMessageId: string,
  classification: InboundClassification,
) {
  return prisma.inboundMessage.update({
    where: { id: inboundMessageId },
    data: { classification, classificationSource: "manual" },
  });
}
