import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getDatePartsInTimeZone, normalizeEmail } from "@/lib/outreach/format";
import { mailboxSettingsSchema, sendingDomainInputSchema } from "@/lib/outreach/validators";

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function getMailboxRampCap(mailbox: {
  createdAt: Date;
  dailyCap: number;
  rampStart: number;
  rampIncrement: number;
  maxDailyCap: number;
}, now = new Date()) {
  const ageMs = now.getTime() - mailbox.createdAt.getTime();
  const ageDays = Math.max(0, Math.floor(ageMs / 86_400_000));
  const rampCap = mailbox.rampStart + ageDays * mailbox.rampIncrement;
  return Math.max(1, Math.min(mailbox.dailyCap, mailbox.maxDailyCap, rampCap));
}

export function usageDateForMailbox(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0));
}

export async function createSendingDomain(input: unknown) {
  const parsed = sendingDomainInputSchema.parse(input);
  const domain = normalizeDomain(parsed.domain);

  return prisma.sendingDomain.upsert({
    where: { domain },
    update: {
      provider: emptyToNull(parsed.provider),
      hostLabel: emptyToNull(parsed.hostLabel),
      purpose: parsed.purpose,
      status: parsed.status,
      isPrimary: parsed.isPrimary,
      notes: emptyToNull(parsed.notes),
    },
    create: {
      domain,
      provider: emptyToNull(parsed.provider),
      hostLabel: emptyToNull(parsed.hostLabel),
      purpose: parsed.purpose,
      status: parsed.status,
      isPrimary: parsed.isPrimary,
      notes: emptyToNull(parsed.notes),
      dnsChecklist: {
        mxHostReady: false,
        brevoDkimReady: false,
        dmarcReady: false,
        senderVerified: false,
        unsubscribeReady: true,
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * Updates a mailbox's timezone and send window after creation. The scheduler checks
 * BOTH the campaign window and the mailbox window before sending, so a mailbox stuck
 * on the wrong timezone silently blocks every send — this makes it editable in the UI.
 */
export async function updateMailboxSettings(input: unknown) {
  const parsed = mailboxSettingsSchema.parse(input);
  return prisma.mailbox.update({
    where: { id: parsed.mailboxId },
    data: {
      timezone: parsed.timezone,
      sendWindow: parsed.sendWindow as unknown as Prisma.InputJsonValue,
      isActive: parsed.isActive,
      healthStatus: parsed.healthStatus,
      warmupState: parsed.warmupState,
      dailyCap: parsed.dailyCap,
      maxDailyCap: Math.max(parsed.maxDailyCap, parsed.dailyCap),
      hourlyCap: parsed.hourlyCap,
      rampStart: parsed.rampStart,
      rampIncrement: parsed.rampIncrement,
      rotationWeight: parsed.rotationWeight,
    },
  });
}

export async function listSendingDomains() {
  return prisma.sendingDomain.findMany({
    include: {
      mailboxes: {
        include: {
          messages: {
            where: {
              status: {
                in: ["SCHEDULED", "CLAIMED", "SENT"],
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function countMailboxSentToday(mailboxId: string, timeZone: string, now = new Date()) {
  const usageDate = usageDateForMailbox(now, timeZone);
  const nextUsageDate = new Date(usageDate);
  nextUsageDate.setUTCDate(nextUsageDate.getUTCDate() + 1);

  return prisma.outboundMessage.count({
    where: {
      mailboxId,
      sentAt: {
        gte: usageDate,
        lt: nextUsageDate,
      },
      status: {
        in: ["SENT", "DELIVERED", "OPENED", "CLICKED"],
      },
    },
  });
}

export async function countMailboxSentThisHour(mailboxId: string, now = new Date()) {
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);

  return prisma.outboundMessage.count({
    where: {
      mailboxId,
      sentAt: {
        gte: hourStart,
      },
      status: {
        in: ["SENT", "DELIVERED", "OPENED", "CLICKED"],
      },
    },
  });
}

export function mailboxLocalPartFromEmail(email: string) {
  return normalizeEmail(email).split("@")[0] ?? "";
}
