import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { addDelayDays, clampSendWindow, createUnsubscribeToken, slugify } from "@/lib/outreach/format";
import { renderSequenceMessage } from "@/lib/outreach/render";
import {
  campaignEnrollmentInputSchema,
  campaignInputSchema,
  sequenceStepInputSchema,
} from "@/lib/outreach/validators";

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

  return prisma.mailbox.create({
    data: {
      name: parsed.name,
      fromEmail: parsed.fromEmail,
      fromName: parsed.fromName,
      replyTo: parsed.replyTo || null,
      dailyCap: parsed.dailyCap,
      timezone: parsed.timezone,
      warmupState: parsed.warmupState,
      isActive: parsed.isActive,
      sendWindow: parsed.sendWindow as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listMailboxes() {
  return prisma.mailbox.findMany({
    include: {
      campaigns: true,
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
  return prisma.campaign.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      mailboxId: parsed.mailboxId,
      timezone: parsed.timezone,
      dailyLimit: parsed.dailyLimit,
      sendWindow: parsed.sendWindow as unknown as Prisma.InputJsonValue,
      createdById,
    },
  });
}

export async function listCampaigns() {
  return prisma.campaign.findMany({
    include: {
      mailbox: true,
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
      mailbox: true,
      steps: {
        orderBy: { stepOrder: "asc" },
      },
      enrollments: {
        include: {
          lead: true,
        },
        orderBy: { enrolledAt: "desc" },
      },
      messages: {
        include: {
          lead: true,
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

export async function scheduleEnrollmentMessages(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      mailbox: true,
      steps: {
        orderBy: { stepOrder: "asc" },
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

  if (!campaign.mailbox.isActive) {
    throw new Error("Campaign mailbox is inactive.");
  }

  if (campaign.steps.length === 0) {
    throw new Error("Campaign requires at least one sequence step.");
  }

  for (const enrollment of campaign.enrollments) {
    if (enrollment.messages.length > 0) {
      continue;
    }

    let cursor = new Date();

    for (const step of campaign.steps) {
      if (step.stepOrder === 1) {
        cursor = addDelayDays(cursor, 0, 0);
      } else {
        cursor = addDelayDays(cursor, step.delayDaysMin, step.delayDaysMax);
      }

      const unsubscribeToken = createUnsubscribeToken(`${enrollment.id}:${step.id}:${Date.now()}:${Math.random()}`);
      const rendered = renderSequenceMessage(step, enrollment.lead, unsubscribeToken);

      await prisma.outboundMessage.create({
        data: {
          campaignId: campaign.id,
          leadId: enrollment.leadId,
          mailboxId: campaign.mailboxId,
          enrollmentId: enrollment.id,
          sequenceStepId: step.id,
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
  }
}

export async function activateCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      mailbox: true,
      steps: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (!campaign.mailbox.isActive) {
    throw new Error("Campaign mailbox must be active before launch.");
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
