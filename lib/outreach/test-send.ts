import { prisma } from "@/lib/prisma";
import { sendBrevoTransactionalEmail } from "@/lib/outreach/brevo";
import { normalizeEmail } from "@/lib/outreach/format";
import { sendViaSmtp } from "@/lib/outreach/smtp";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export interface TestSendInput {
  mailboxId: string;
  to: string;
  subject?: string;
  body?: string;
}

export interface TestSendResult {
  messageId: string;
  from: string;
  to: string;
  transport: "SMTP" | "BREVO";
}

/**
 * Sends a single ad-hoc email from a mailbox to any address, through the exact same
 * transport a real campaign would use (the mailbox's SMTP or the Brevo relay). It's a
 * deliverability probe — "send one to myself and see if it lands in Primary or Spam" —
 * so it deliberately carries no tracking pixel, unsubscribe footer, or DB record.
 */
export async function sendTestEmail(input: TestSendInput): Promise<TestSendResult> {
  const mailbox = await prisma.mailbox.findUnique({ where: { id: input.mailboxId } });
  if (!mailbox) {
    throw new Error("Mailbox not found.");
  }

  const to = normalizeEmail(input.to ?? "");
  if (!to) {
    throw new Error("Recipient email is required.");
  }

  const subject = input.subject?.trim() || "Test — OutreachOS";
  const text =
    input.body?.trim() ||
    "Hi,\n\nThis is a quick test from OutreachOS to check where this email lands (Primary, Promotions, or Spam).\n\nThanks!";
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#171717">${escapeHtml(text).replace(/\n/g, "<br />")}</div>`;

  const useSmtp = mailbox.sendTransport === "SMTP";
  const response = useSmtp
    ? await sendViaSmtp({
        mailbox,
        to: { email: to },
        subject,
        html,
        headers: {},
      })
    : await sendBrevoTransactionalEmail({
        sender: { email: mailbox.fromEmail, name: mailbox.fromName },
        replyTo: mailbox.replyTo ? { email: mailbox.replyTo } : undefined,
        to: [{ email: to }],
        subject,
        htmlContent: html,
        tags: ["test"],
        headers: {},
      });

  return {
    messageId: response.messageId,
    from: mailbox.fromEmail,
    to,
    transport: useSmtp ? "SMTP" : "BREVO",
  };
}
