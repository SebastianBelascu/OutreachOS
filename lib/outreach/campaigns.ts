import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  addDelayDays,
  clampSendWindow,
  createSeededRng,
  createUnsubscribeToken,
  slugify,
  weightedIndex,
} from "@/lib/outreach/format";
import { mailboxLocalPartFromEmail } from "@/lib/outreach/mailboxes";
import { encryptSecret, hasCredentialsKey } from "@/lib/outreach/crypto";
import { renderSequenceMessage } from "@/lib/outreach/render";
import { buildLeadTemplateParams, findMissingPersonalization } from "@/lib/outreach/variables";
import {
  campaignEnrollmentInputSchema,
  campaignInputSchema,
  createCampaignFromTemplateSchema,
  sequenceStepInputSchema,
  sequenceStepVariantInputSchema,
} from "@/lib/outreach/validators";
import { getCampaignTemplate } from "@/lib/outreach/templates";

/**
 * The campaign's effective daily limit for `now`, applying an optional warmup ramp
 * (mirrors getMailboxRampCap). When rampEnabled, the cap grows from rampStart by
 * rampIncrement per day since activation, never exceeding dailyLimit.
 */
export function getCampaignEffectiveDailyLimit(
  campaign: {
    dailyLimit: number;
    rampEnabled: boolean;
    rampStart: number;
    rampIncrement: number;
    lastActivatedAt: Date | null;
  },
  now = new Date(),
) {
  if (!campaign.rampEnabled || !campaign.lastActivatedAt) {
    return campaign.dailyLimit;
  }

  const ageMs = now.getTime() - campaign.lastActivatedAt.getTime();
  const ageDays = Math.max(0, Math.floor(ageMs / 86_400_000));
  const rampCap = campaign.rampStart + ageDays * campaign.rampIncrement;
  return Math.max(1, Math.min(campaign.dailyLimit, rampCap));
}

function parseSendWindow(windowValue: Prisma.JsonValue | null) {
  if (!windowValue || typeof windowValue !== "object" || Array.isArray(windowValue)) {
    return clampSendWindow();
  }

  const candidate = windowValue as Record<string, unknown>;
  return clampSendWindow({
    days: Array.isArray(candidate.days)
      ? candidate.days.map((value) => Number(value))
      : undefined,
    startHour: Number(candidate.startHour),
    endHour: Number(candidate.endHour),
  });
}

export async function createMailbox(input: unknown) {
  const { mailboxInputSchema } = await import("@/lib/outreach/validators");
  const parsed = mailboxInputSchema.parse(input);
  const fromDomain = parsed.fromEmail.split("@")[1]?.toLowerCase();
  const selectedDomain =
    parsed.domainId ||
    (fromDomain
      ? (
          await prisma.sendingDomain.findUnique({
            where: { domain: fromDomain },
            select: { id: true },
          })
        )?.id
      : null);

  const imapPassword = parsed.imapPassword?.trim() || "";
  const imapConfigured = Boolean(parsed.imapHost && parsed.imapUsername && imapPassword);
  const imapPasswordEnc = imapPassword && hasCredentialsKey() ? encryptSecret(imapPassword) : null;

  const smtpPassword = parsed.smtpPassword?.trim() || "";
  const smtpConfigured = Boolean(parsed.smtpHost && parsed.smtpUsername && smtpPassword);
  const smtpPasswordEnc = smtpPassword && hasCredentialsKey() ? encryptSecret(smtpPassword) : null;
  // SMTP is the default sender. Brevo remains available when explicitly selected.
  const sendTransport = parsed.sendTransport === "SMTP" || (smtpConfigured && parsed.sendTransport !== "BREVO")
    ? "SMTP"
    : "BREVO";

  return prisma.mailbox.create({
    data: {
      domainId: selectedDomain || null,
      name: parsed.name,
      fromEmail: parsed.fromEmail,
      fromName: parsed.fromName,
      provider: parsed.provider,
      hostLabel: parsed.hostLabel || null,
      localPart: parsed.localPart || mailboxLocalPartFromEmail(parsed.fromEmail),
      replyTo: parsed.replyTo || null,
      dailyCap: parsed.dailyCap,
      rampStart: parsed.rampStart,
      rampIncrement: parsed.rampIncrement,
      maxDailyCap: Math.max(parsed.maxDailyCap, parsed.rampStart),
      rotationWeight: parsed.rotationWeight,
      timezone: parsed.timezone,
      warmupState: parsed.warmupState,
      healthStatus: parsed.healthStatus,
      hourlyCap: parsed.hourlyCap,
      sendTransport,
      smtpHost: parsed.smtpHost || null,
      smtpPort: parsed.smtpPort,
      smtpSecure: parsed.smtpSecure,
      smtpUsername: parsed.smtpUsername || null,
      smtpPasswordEnc,
      imapHost: parsed.imapHost || null,
      imapUsername: parsed.imapUsername || null,
      imapPort: parsed.imapPort,
      imapPasswordEnc,
      connectionStatus: imapConfigured ? "READY" : parsed.connectionStatus,
      isActive: parsed.isActive,
      sendWindow: parsed.sendWindow as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listMailboxes() {
  return prisma.mailbox.findMany({
    omit: { imapPasswordEnc: true, smtpPasswordEnc: true },
    include: {
      domain: true,
      campaigns: true,
      campaignPoolAssignments: {
        include: {
          campaign: true,
        },
      },
      messages: {
        where: {
          status: {
            in: ["SCHEDULED", "CLAIMED", "SENT"],
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCampaign(input: unknown, createdById: string) {
  const parsed = campaignInputSchema.parse(input);
  const mailboxIds = [...new Set([parsed.mailboxId, ...parsed.mailboxIds].filter(Boolean))];
  return prisma.campaign.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      mailboxId: parsed.mailboxId,
      timezone: parsed.timezone,
      dailyLimit: parsed.dailyLimit,
      rampEnabled: parsed.rampEnabled,
      rampStart: parsed.rampStart,
      rampIncrement: parsed.rampIncrement,
      sendWindow: parsed.sendWindow as unknown as Prisma.InputJsonValue,
      createdById,
      mailboxPool: {
        create: mailboxIds.map((mailboxId) => ({
          mailboxId,
        })),
      },
    },
  });
}

export async function createCampaignFromTemplate(input: unknown, createdById: string) {
  const parsed = createCampaignFromTemplateSchema.parse(input);
  const template = getCampaignTemplate(parsed.templateId);
  if (!template) {
    throw new Error("Unknown campaign template.");
  }

  const mailboxIds = [...new Set([parsed.mailboxId, ...parsed.mailboxIds].filter(Boolean))];
  const sendWindow = parsed.sendWindow ?? clampSendWindow();

  return prisma.campaign.create({
    data: {
      name: parsed.name || template.name,
      description: template.description,
      mailboxId: parsed.mailboxId,
      timezone: parsed.timezone,
      dailyLimit: parsed.dailyLimit || template.defaultDailyLimit,
      sendWindow: sendWindow as unknown as Prisma.InputJsonValue,
      createdById,
      mailboxPool: {
        create: mailboxIds.map((mailboxId) => ({ mailboxId })),
      },
      steps: {
        create: template.steps.map((step, index) => ({
          stepOrder: index + 1,
          subject: step.subject,
          body: step.body,
          delayDaysMin: step.delayDaysMin,
          delayDaysMax: Math.max(step.delayDaysMax, step.delayDaysMin),
          stopOnReply: step.stopOnReply,
        })),
      },
    },
  });
}

export async function listCampaigns() {
  return prisma.campaign.findMany({
    include: {
      mailbox: {
        include: {
          domain: true,
        },
      },
      mailboxPool: {
        include: {
          mailbox: {
            include: {
              domain: true,
            },
          },
        },
      },
      steps: {
        orderBy: { stepOrder: "asc" },
      },
      enrollments: true,
      messages: {
        where: {
          status: {
            in: ["SCHEDULED", "CLAIMED", "SENT"],
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCampaignById(campaignId: string) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      mailbox: {
        include: {
          domain: true,
        },
      },
      mailboxPool: {
        include: {
          mailbox: {
            include: {
              domain: true,
            },
          },
        },
      },
      steps: {
        orderBy: { stepOrder: "asc" },
        include: {
          variants: {
            orderBy: { label: "asc" },
          },
        },
      },
      enrollments: {
        include: {
          lead: true,
          messages: { select: { id: true }, take: 1 },
        },
        orderBy: { enrolledAt: "desc" },
      },
      messages: {
        include: {
          lead: true,
          mailbox: true,
        },
        orderBy: { scheduledAt: "desc" },
        take: 50,
      },
      events: {
        orderBy: { occurredAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function createSequenceStep(input: unknown) {
  const parsed = sequenceStepInputSchema.parse(input);
  const stepCount = await prisma.sequenceStep.count({
    where: { campaignId: parsed.campaignId },
  });

  return prisma.sequenceStep.create({
    data: {
      campaignId: parsed.campaignId,
      stepOrder: stepCount + 1,
      subject: parsed.subject,
      body: parsed.body,
      delayDaysMin: parsed.delayDaysMin,
      delayDaysMax: Math.max(parsed.delayDaysMax, parsed.delayDaysMin),
      stopOnReply: parsed.stopOnReply,
    },
  });
}

export async function createSequenceStepVariant(input: unknown) {
  const parsed = sequenceStepVariantInputSchema.parse(input);
  return prisma.sequenceStepVariant.create({
    data: {
      sequenceStepId: parsed.sequenceStepId,
      label: parsed.label.toUpperCase(),
      subject: parsed.subject,
      body: parsed.body,
      weight: parsed.weight,
      isActive: parsed.isActive,
    },
  });
}

export async function toggleSequenceStepVariant(variantId: string, isActive: boolean) {
  return prisma.sequenceStepVariant.update({
    where: { id: variantId },
    data: { isActive },
  });
}

export async function deleteSequenceStepVariant(variantId: string) {
  return prisma.sequenceStepVariant.delete({
    where: { id: variantId },
  });
}

export async function enrollLeadsInCampaign(input: unknown) {
  const parsed = campaignEnrollmentInputSchema.parse(input);
  const campaign = await prisma.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: {
      steps: {
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.steps.length === 0) {
    throw new Error("Campaign must have at least one sequence step before enrollment.");
  }

  const leads = await prisma.lead.findMany({
    where: {
      id: {
        in: parsed.leadIds,
      },
    },
  });

  const activeSuppressions = await prisma.suppressionEntry.findMany({
    where: {
      leadId: {
        in: parsed.leadIds,
      },
    },
  });
  const suppressedLeadIds = new Set(activeSuppressions.map((entry) => entry.leadId));

  const createdEnrollments = [];

  for (const lead of leads) {
    if (suppressedLeadIds.has(lead.id)) {
      continue;
    }

    const enrollment = await prisma.campaignEnrollment.upsert({
      where: {
        campaignId_leadId: {
          campaignId: parsed.campaignId,
          leadId: lead.id,
        },
      },
      update: {
        status: "ACTIVE",
        stoppedReason: null,
        completedAt: null,
      },
      create: {
        campaignId: parsed.campaignId,
        leadId: lead.id,
      },
    });

    createdEnrollments.push({ enrollment, lead });
  }

  return createdEnrollments;
}

/**
 * All copy a lead could receive from a campaign — every step's subject/body plus any
 * variant copy. Used to detect which personalization variables the sequence relies on.
 */
export function campaignSequenceText(
  steps: { subject: string; body: string; variants?: { subject: string; body: string }[] }[],
) {
  return steps
    .flatMap((step) => [
      step.subject,
      step.body,
      ...(step.variants ?? []).flatMap((variant) => [variant.subject, variant.body]),
    ])
    .join("\n");
}

export async function scheduleEnrollmentMessages(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      mailbox: true,
      mailboxPool: {
        include: {
          mailbox: {
            include: {
              domain: true,
            },
          },
        },
      },
      steps: {
        orderBy: { stepOrder: "asc" },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { label: "asc" },
          },
        },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          lead: true,
          messages: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const usableMailboxes = campaign.mailboxPool
    .filter((entry) => entry.isActive)
    .map((entry) => entry.mailbox)
    .filter((mailbox) => mailbox.isActive);

  if (usableMailboxes.length === 0 && !campaign.mailbox.isActive) {
    throw new Error("Campaign has no active mailbox pool.");
  }

  if (campaign.steps.length === 0) {
    throw new Error("Campaign requires at least one sequence step.");
  }

  // Personalization the sequence relies on (e.g. {{first_line}}). Leads that can't fill
  // it are held back — they stay enrolled (ACTIVE) but unscheduled, so once the operator
  // adds the value a later schedule run picks them up automatically.
  const sequenceText = campaignSequenceText(campaign.steps);
  let scheduledCount = 0;
  const heldLeadIds: string[] = [];

  for (const enrollment of campaign.enrollments) {
    if (enrollment.messages.length > 0) {
      continue;
    }

    const missingPersonalization = findMissingPersonalization(
      sequenceText,
      buildLeadTemplateParams(enrollment.lead),
    );
    if (missingPersonalization.length > 0) {
      heldLeadIds.push(enrollment.leadId);
      continue;
    }

    let cursor = new Date();

    for (const step of campaign.steps) {
      if (step.stepOrder === 1) {
        cursor = addDelayDays(cursor, 0, 0);
      } else {
        cursor = addDelayDays(cursor, step.delayDaysMin, step.delayDaysMax);
      }

      // A/B: when a step has active variants, deterministically pick one (weighted) per
      // enrollment+step so re-runs are stable; otherwise use the base step copy.
      const activeVariants = step.variants ?? [];
      let variantId: string | null = null;
      let chosenSubject = step.subject;
      let chosenBody = step.body;
      if (activeVariants.length > 0) {
        const draw = createSeededRng(`${enrollment.id}:${step.id}`)();
        const index = weightedIndex(
          activeVariants.map((variant) => variant.weight),
          draw,
        );
        const chosen = activeVariants[index];
        variantId = chosen.id;
        chosenSubject = chosen.subject;
        chosenBody = chosen.body;
      }

      const unsubscribeToken = createUnsubscribeToken(`${enrollment.id}:${step.id}:${Date.now()}:${Math.random()}`);
      const rendered = renderSequenceMessage(
        { subject: chosenSubject, body: chosenBody },
        enrollment.lead,
        unsubscribeToken,
      );

      await prisma.outboundMessage.create({
        data: {
          campaignId: campaign.id,
          leadId: enrollment.leadId,
          mailboxId: usableMailboxes[0]?.id ?? campaign.mailboxId,
          enrollmentId: enrollment.id,
          sequenceStepId: step.id,
          variantId,
          subject: rendered.subject,
          htmlBody: rendered.htmlBody,
          textBody: rendered.subject,
          dynamicParams: {
            leadSlug: slugify(enrollment.lead.company ?? enrollment.lead.email),
          } as unknown as Prisma.InputJsonValue,
          tags: [
            `campaign:${campaign.id}`,
            `step:${step.stepOrder}`,
            `lead:${enrollment.leadId}`,
          ],
          scheduledAt: cursor,
          unsubscribeToken,
        },
      });
    }

    scheduledCount += 1;
  }

  return { scheduledCount, heldLeadIds };
}

export async function activateCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      mailbox: true,
      mailboxPool: {
        include: {
          mailbox: {
            include: {
              domain: true,
            },
          },
        },
      },
      steps: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const readyMailboxes = campaign.mailboxPool
    .filter((entry) => entry.isActive)
    .map((entry) => entry.mailbox)
    .filter((mailbox) => {
      const domainReady = !mailbox.domain || mailbox.domain.status === "READY";
      return (
        mailbox.isActive &&
        domainReady &&
        mailbox.warmupState !== "PAUSED" &&
        ["HEALTHY", "WARNING"].includes(mailbox.healthStatus)
      );
    });

  if (readyMailboxes.length === 0) {
    throw new Error("Campaign needs at least one ready mailbox before launch.");
  }

  if (campaign.steps.length === 0) {
    throw new Error("Campaign needs at least one step before launch.");
  }

  const sendWindow = parseSendWindow(campaign.sendWindow);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "ACTIVE",
      lastActivatedAt: new Date(),
      sendWindow: sendWindow as unknown as Prisma.InputJsonValue,
    },
  });

  await scheduleEnrollmentMessages(campaignId);
}

export async function pauseEnrollment(leadId: string, campaignId: string) {
  await prisma.campaignEnrollment.updateMany({
    where: { leadId, campaignId, status: "ACTIVE" },
    data: { status: "PAUSED" },
  });

  await prisma.outboundMessage.updateMany({
    where: { leadId, campaignId, status: { in: ["SCHEDULED", "CLAIMED"] } },
    data: { status: "CANCELLED" },
  });
}

export async function stopLeadInCampaign(leadId: string, campaignId: string, reason: string) {
  await prisma.campaignEnrollment.updateMany({
    where: {
      leadId,
      campaignId,
    },
    data: {
      status: "STOPPED",
      stoppedReason: reason,
      completedAt: new Date(),
    },
  });

  await prisma.outboundMessage.updateMany({
    where: {
      leadId,
      campaignId,
      status: {
        in: ["SCHEDULED", "CLAIMED"],
      },
    },
    data: {
      status: "CANCELLED",
    },
  });
}
