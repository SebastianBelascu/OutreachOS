"use server";

import { revalidatePath } from "next/cache";

import {
  activateCampaign,
  createCampaign,
  createMailbox,
  createSequenceStep,
  enrollLeadsInCampaign,
  scheduleEnrollmentMessages,
} from "@/lib/outreach/campaigns";
import { requireAppUser } from "@/lib/outreach/auth";
import { createLead, createLeadNote } from "@/lib/outreach/leads";
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
  return {
    days: splitCommaValues(String(formData.get("sendWindowDays") ?? "1,2,3,4,5")).map((value) => Number(value)),
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

export async function createMailboxAction(formData: FormData) {
  await createMailbox({
    name: requireValue(formData.get("name"), "Mailbox name"),
    fromEmail: requireValue(formData.get("fromEmail"), "From email"),
    fromName: requireValue(formData.get("fromName"), "From name"),
    replyTo: String(formData.get("replyTo") ?? ""),
    dailyCap: Number(formData.get("dailyCap") ?? "30"),
    timezone: String(formData.get("timezone") ?? "Europe/Bucharest"),
    warmupState: String(formData.get("warmupState") ?? "COLD"),
    isActive: parseBoolean(formData.get("isActive")),
    sendWindow: sendWindowFromFormData(formData),
  });

  revalidatePath("/mailboxes");
  revalidatePath("/campaigns");
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
      timezone: String(formData.get("timezone") ?? "Europe/Bucharest"),
      dailyLimit: Number(formData.get("dailyLimit") ?? "30"),
      sendWindow: sendWindowFromFormData(formData),
    },
    appUser.id,
  );

  revalidatePath("/campaigns");
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

export async function enrollLeadsAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");
  const leadIds = splitCommaValues(String(formData.get("leadIds") ?? ""));

  await enrollLeadsInCampaign({
    campaignId,
    leadIds,
  });
  await scheduleEnrollmentMessages(campaignId);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function activateCampaignAction(formData: FormData) {
  const campaignId = requireValue(formData.get("campaignId"), "Campaign");
  await activateCampaign(campaignId);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
}
