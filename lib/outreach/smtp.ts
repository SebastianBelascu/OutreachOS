import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/outreach/crypto";

export interface SmtpMailboxConfig {
  fromEmail: string;
  fromName: string;
  replyTo: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string | null;
  smtpPasswordEnc: string | null;
}

export interface SmtpSendInput {
  mailbox: SmtpMailboxConfig;
  to: { email: string; name?: string };
  subject: string;
  html: string;
  headers: Record<string, string>;
}

export class SmtpSendError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "SmtpSendError";
    this.retryable = retryable;
  }
}

export function isSmtpConfigured(mailbox: SmtpMailboxConfig) {
  return Boolean(mailbox.smtpHost && mailbox.smtpUsername && mailbox.smtpPasswordEnc);
}

function buildTransport(mailbox: SmtpMailboxConfig) {
  if (!isSmtpConfigured(mailbox)) {
    throw new SmtpSendError("SMTP is not configured for this mailbox.", false);
  }

  return nodemailer.createTransport({
    host: mailbox.smtpHost as string,
    port: mailbox.smtpPort,
    secure: mailbox.smtpSecure, // true for 465, false for 587 (STARTTLS)
    auth: {
      user: mailbox.smtpUsername as string,
      pass: decryptSecret(mailbox.smtpPasswordEnc as string),
    },
  });
}

function isRetryable(error: unknown) {
  const err = error as { code?: string; responseCode?: number };
  if (err.code && ["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "EAI_AGAIN", "ECONNRESET"].includes(err.code)) {
    return true;
  }
  if (typeof err.responseCode === "number") {
    // 4xx are temporary (greylisting, rate limits); 5xx are permanent.
    return err.responseCode >= 400 && err.responseCode < 500;
  }
  return false;
}

/**
 * Sends one message directly through the mailbox's own SMTP server (Gmail/Workspace
 * app password, generic host, or the Brevo SMTP relay). Returns the Message-ID so
 * inbound replies can be threaded back to it.
 */
export async function sendViaSmtp(input: SmtpSendInput): Promise<{ messageId: string }> {
  const transporter = buildTransport(input.mailbox);
  try {
    const info = await transporter.sendMail({
      from: { address: input.mailbox.fromEmail, name: input.mailbox.fromName },
      replyTo: input.mailbox.replyTo ?? undefined,
      to: input.to.name ? { address: input.to.email, name: input.to.name } : input.to.email,
      subject: input.subject,
      html: input.html,
      headers: input.headers,
    });
    return { messageId: info.messageId };
  } catch (error) {
    throw new SmtpSendError(
      error instanceof Error ? error.message : "SMTP send failed.",
      isRetryable(error),
    );
  } finally {
    transporter.close();
  }
}

/** Verifies SMTP credentials with a connection handshake. Updates connectionStatus. */
export async function testSmtpConnection(mailboxId: string) {
  const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mailbox || !isSmtpConfigured(mailbox)) {
    return { ok: false, error: "SMTP is not configured for this mailbox." };
  }

  const transporter = buildTransport(mailbox);
  try {
    await transporter.verify();
    await prisma.mailbox.update({
      where: { id: mailboxId },
      data: { connectionStatus: "READY", imapLastError: null },
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP connection failed.";
    await prisma.mailbox.update({
      where: { id: mailboxId },
      data: { connectionStatus: "ERROR", imapLastError: `SMTP: ${message}` },
    });
    return { ok: false, error: message };
  } finally {
    transporter.close();
  }
}
