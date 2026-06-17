"use server";

import { revalidatePath } from "next/cache";

import {
  activateCampaign,
  createCampaign,
  createCampaignFromTemplate,
  createMailbox,
  createSequenceStep,
  createSequenceStepVariant,
  deleteSequenceStepVariant,
  enrollLeadsInCampaign,
  pauseEnrollment,
  scheduleEnrollmentMessages,
  toggleSequenceStepVariant,
  updateCampaignSettings,
  updateSequenceStep,
} from "@/lib/outreach/campaigns";
import { requireAppUser } from "@/lib/outreach/auth";
import {
  createLead,
  createLeadNote,
  generateLeadFirstLine,
  generateMissingFirstLines,
  setLeadStatus,
} from "@/lib/outreach/leads";
import {
  archiveInbound,
  markInboundRead,
  sendInboxReply,
  setInboundClassification,
} from "@/lib/outreach/replies";
import type { InboundClassification } from "@prisma/client";
import { createSendingDomain, updateMailboxSettings } from "@/lib/outreach/mailboxes";
import { verifySendingDomain } from "@/lib/outreach/dns";
import { splitCommaValues } from "@/lib/outreach/format";

function requireValue(value: FormDataEntryValue | null, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return value;
}

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function sendWindowFromFormData(formData: FormData) {
  const selectedDays = formData
    .getAll("sendWindowDays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7);

  return {
    days:
      selectedDays.length > 0
        ? selectedDays
        : splitCommaValues(String(formData.get("sendWindowDays") ?? "1,2,3,4,5")).map((value) => Number(value)),
    startHour: Number(formData.get("sendWindowStartHour") ?? "9"),
    endHour: Number(formData.get("sendWindowEndHour") ?? "17"),
  };
}

export async function createLeadAction(formData: FormData) {
  const appUser = await requireAppUser();
  if (!appUser) {
    throw new Error("Authentication required.");
  }

  await createLead(
    {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: requireValue(formData.get("email"), "Email"),
      company: String(formData.get("company") ?? ""),
      website: String(formData.get("website") ?? ""),
      industry: String(formData.get("industry") ?? ""),
      country: String(formData.get("country") ?? ""),
      linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
      status: String(formData.get("status") ?? "NEW"),
      tags: splitCommaValues(String(formData.get("tags") ?? "")),
      customFields: {},
    },
    appUser.id,
  );

  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function createLeadNoteAction(formData: FormData) {
  const appUser = await requireAppUser();
  if (!appUser) {
    throw new Error("Authentication required.");
  }

  await createLeadNote(
    {
      leadId: requireValue(formData.get("leadId"), "Lead"),
      content: requireValue(formData.get("content"), "Note"),
    },
    appUser.id,
  );

  revalidatePath(`/leads/${String(formData.get("leadId"))}`);
}

export async function createSendingDomainAction(formData: FormData) {
  await createSendingDomain({
    domain: requireValue(formData.get("domain"), "Domain"),
    provider: String(formData.get("provider") ?? ""),
    hostLabel: String(formData.get("hostLabel") ?? ""),
    purpose: String(formData.get("purpose") ?? "OUTREACH"),
    status: String(formData.get("status") ?? "NEEDS_SETUP"),
    isPrimary: parseBoolean(formData.get("isPrimary")),
    notes: String(formData.get("notes") ?? ""),
  });

  revalidatePath("/domains");
  revalidatePath("/mailboxes");
}

export async function verifySendingDomainAction(formData: FormData) {
  const domainId = requireValue(formData.get("domainId"), "Domain");
  await verifySendingDomain(domainId);

  revalidatePath("/domains");
  revalidatePath("/dashboard");
}

export async function createMailboxAction(formData: FormData) {
  await createMailbox({
    domainId: String(formData.get("domainId") ?? ""),
    name: requireValue(formData.get("name"), "Mailbox name"),
    fromEmail: requireValue(formData.get("fromEmail"), "From email"),
    fromName: requireValue(formData.get("fromName"), "From name"),
    provider: String(formData.get("provider") ?? "EMAIL_HOST"),
    hostLabel: String(formData.get("hostLabel") ?? ""),
    localPart: String(formData.get("localPart") ?? ""),
    replyTo: String(formData.get("replyTo") ?? ""),
    dailyCap: Number(formData.get("dailyCap") ?? "30"),
    rampStart: Number(formData.get("rampStart") ?? "5"),
    rampIncrement: Number(formData.get("rampIncrement") ?? "5"),
    maxDailyCap: Number(formData.get("maxDailyCap") ?? "50"),
    rotationWeight: Number(formData.get("rotationWeight") ?? "1"),
    timezone: String(formData.get("timezone") ?? "Europe/Bucharest"),
    warmupState: String(formData.get("warmupState") ?? "COLD"),
    healthStatus: String(formData.get("healthStatus") ?? "UNVERIFIED"),
    hourlyCap: Number(formData.get("hourlyCap") ?? "8"),
    sendTransport: String(formData.get("sendTransport") ?? "SMTP"),
    smtpHost: String(formData.get("smtpHost") ?? ""),
    smtpPort: Number(formData.get("smtpPort") ?? "587"),
    smtpSecure: parseBoolean(formData.get("smtpSecure")),
    smtpUsername: String(formData.get("smtpUsername") ?? ""),
    smtpPassword: String(formData.get("smtpPassword") ?? ""),
    imapHost: String(formData.get("imapHost") ?? ""),
    imapUsername: String(formData.get("imapUsername") ?? ""),
    imapPort: Number(formData.get("imapPort") ?? "993"),
    imapPassword: String(formData.get("imapPassword") ?? ""),
    connectionStatus: String(formData.get("connectionStatus") ?? "NOT_CONFIGURED"),
    isActive: parseBoolean(formData.get("isActive")),
    sendWindow: sendWindowFromFormData(formData),
  });

  revalidatePath("/mailboxes");
  revalidatePath("/domains");
  revalidatePath("/campaigns");
}

export async function testMailboxConnectionAction(formData: FormData) {
  const mailboxId = requireValue(formData.get("mailboxId"), "Mailbox");
  const { testMailboxConnection } = await import("@/lib/outreach/imap");
  await testMailboxConnection(mailboxId);

  revalidatePath("/mailboxes");
}

export async function testSmtpConnectionAction(formData: FormData) {
  const mailboxId = requireValue(formData.get("mailboxId"), "Mailbox");
  const { testSmtpConnection } = await import("@/lib/outreach/smtp");
  await testSmtpConnection(mailboxId);

  revalidatePath("/mailboxes");
}

export async function createCampaignAction(formData: FormData) {
  const appUser = await requireAppUser();
  if (!appUser) {
    throw new Error("Authentication required.");
  }

  await createCampaign(
    {
      name: requireValue(formData.get("name"), "Campaign name"),
      description: String(formData.get("description") ?? ""),
      mailboxId: requireValue(formData.get("mailboxId"), "Mailbox"),
      mailboxIds: formData.getAll("mailboxIds").map((value) => String(value)),
      timezone: String(formData.get("timezone") ?? "Europe/Bucharest"),
      dailyLimit: Number(formData.get("dailyLimit") ?? "30"),
      rampEnabled: parseBoolean(formData.get("rampEnabled")),
      rampStart: Number(formData.get("rampStart") ?? "10"),
      rampIncrement: Number(formData.get("rampIncrement") ?? "5"),
      sendWindow: sendWindowFromFormData(formData),
    },
    appUser.id,
  );

  revalidatePath("/campaigns");
}

export async function createCampaignFromTemplateAction(formData: FormData) {
  const appUser = await requireAppUser();
  if (!appUser) {
    throw new Error("Authentication required.");
  }

  const campaign = await createCampaignFromTemplate(
    {
      templateId: requireValue(formData.get("templateId"), "Template"),
      name: String(formData.get("name") ?? ""),
      mailboxId: requireValue(formData.get("mailboxId"), "Mailbox"),
      mailboxIds: formData.getAll("mailboxIds").map((value) => String(value)),
      timezone: String(formData.get("timezone") ?? "Europe/Bucharest"),
      dailyLimit: Number(formData.get("dailyLimit") ?? "30"),
      sendWindow: sendWindowFromFormData(formData),
    },
    appUser.id,
  );

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaign.id}`);
}

export async function updateCampaignSettingsAction(formData: FormData) {
  const appUser = await requireAppUser();
  if (!appUser) {
    throw new Error("Authentication required.");
  }

  const campaignId = requireValue(formData.get("campaignId"), "Campaign");
  await updateCampaignSettings({
    campaignId,
    timezone: String(formData.get("timezone") ?? "America/New_York"),
    dailyLimit: Number(formData.get("dailyLimit") ?? "30"),
    sendWindow: sendWindowFromFormData(formData),
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function updateMailboxSettingsAction(formData: FormData) {
  const appUser = await requireAppUser();
  if (!appUser) {
    throw new Error("Authentication required.");
  }

  const mailboxId = requireValue(formData.get("mailboxId"), "Mailbox");
  await updateMailboxSettings({
    mailboxId,
    timezone: String(formData.get("timezone") ?? "America/New_York"),
    sendWindow: sendWindowFromFormData(formData),
    isActive: parseBoolean(formData.get("isActive")),
    healthStatus: String(formData.get("healthStatus") ?? "HEALTHY"),
    warmupState: String(formData.get("warmupState") ?? "ACTIVE"),
    dailyCap: Number(formData.get("dailyCap") ?? "30"),
    maxDailyCap: Number(formData.get("maxDailyCap") ?? "50"),
    hourlyCap: Number(formData.get("hourlyCap") ?? "8"),
    rampStart: Number(formData.get("rampStart") ?? "5"),
    rampIncrement: Number(formData.get("rampIncrement") ?? "5"),
    rotationWeight: Number(formData.get("rotationWeight") ?? "1"),
  });

  revalidatePath("/mailboxes");
}

export async function createSequenceStepAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");

  await createSequenceStep({
    campaignId,
    subject: requireValue(formData.get("subject"), "Subject"),
    body: requireValue(formData.get("body"), "Body"),
    delayDaysMin: Number(formData.get("delayDaysMin") ?? "0"),
    delayDaysMax: Number(formData.get("delayDaysMax") ?? "0"),
    stopOnReply: parseBoolean(formData.get("stopOnReply")),
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function updateSequenceStepAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");

  await updateSequenceStep({
    stepId: requireValue(formData.get("stepId"), "Step"),
    subject: requireValue(formData.get("subject"), "Subject"),
    body: requireValue(formData.get("body"), "Body"),
    delayDaysMin: Number(formData.get("delayDaysMin") ?? "0"),
    delayDaysMax: Number(formData.get("delayDaysMax") ?? "0"),
    stopOnReply: parseBoolean(formData.get("stopOnReply")),
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function createSequenceStepVariantAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");

  await createSequenceStepVariant({
    sequenceStepId: requireValue(formData.get("sequenceStepId"), "Step"),
    label: requireValue(formData.get("label"), "Label"),
    subject: requireValue(formData.get("subject"), "Subject"),
    body: requireValue(formData.get("body"), "Body"),
    weight: Number(formData.get("weight") ?? "1"),
    isActive: true,
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function toggleSequenceStepVariantAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");
  await toggleSequenceStepVariant(
    requireValue(formData.get("variantId"), "Variant"),
    parseBoolean(formData.get("isActive")),
  );

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function deleteSequenceStepVariantAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");
  await deleteSequenceStepVariant(requireValue(formData.get("variantId"), "Variant"));

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function enrollLeadsAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");
  const selectedLeadIds = formData
    .getAll("leadIds")
    .map((value) => String(value))
    .filter(Boolean);
  const leadIds =
    selectedLeadIds.length > 0
      ? selectedLeadIds
      : splitCommaValues(String(formData.get("leadIds") ?? ""));

  await enrollLeadsInCampaign({
    campaignId,
    leadIds,
  });
  await scheduleEnrollmentMessages(campaignId);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function generateLeadFirstLineAction(formData: FormData) {
  const appUser = await requireAppUser();
  if (!appUser) {
    throw new Error("Authentication required.");
  }
  const leadId = requireValue(formData.get("leadId"), "Lead");
  await generateLeadFirstLine(leadId);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function generateMissingFirstLinesAction(formData: FormData) {
  const appUser = await requireAppUser();
  if (!appUser) {
    throw new Error("Authentication required.");
  }
  const limit = Number(formData.get("limit") ?? "50");
  await generateMissingFirstLines(Number.isFinite(limit) && limit > 0 ? limit : 50);

  revalidatePath("/leads");
}

export async function markInboundReadAction(formData: FormData) {
  await markInboundRead(
    requireValue(formData.get("inboundMessageId"), "Message"),
    parseBoolean(formData.get("isRead")),
  );
  revalidatePath("/inbox");
}

export async function archiveInboundAction(formData: FormData) {
  await archiveInbound(requireValue(formData.get("inboundMessageId"), "Message"));
  revalidatePath("/inbox");
}

export async function setInboundClassificationAction(formData: FormData) {
  await setInboundClassification(
    requireValue(formData.get("inboundMessageId"), "Message"),
    requireValue(formData.get("classification"), "Classification") as InboundClassification,
  );
  revalidatePath("/inbox");
}

export async function setLeadStatusFromInboxAction(formData: FormData) {
  await setLeadStatus(
    requireValue(formData.get("leadId"), "Lead"),
    requireValue(formData.get("status"), "Status"),
  );
  revalidatePath("/inbox");
  revalidatePath("/leads");
}

export async function pauseEnrollmentFromInboxAction(formData: FormData) {
  await pauseEnrollment(
    requireValue(formData.get("leadId"), "Lead"),
    requireValue(formData.get("campaignId"), "Campaign"),
  );
  revalidatePath("/inbox");
}

export async function sendInboxReplyAction(formData: FormData) {
  await sendInboxReply({
    inboundMessageId: requireValue(formData.get("inboundMessageId"), "Message"),
    body: requireValue(formData.get("body"), "Reply"),
  });
  revalidatePath("/inbox");
}

export async function activateCampaignAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");
  await activateCampaign(campaignId);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
}
