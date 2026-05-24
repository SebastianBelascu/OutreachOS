import { z } from "zod";

import {
  CAMPAIGN_STATUSES,
  ENROLLMENT_STATUSES,
  LEAD_STATUSES,
  MAILBOX_WARMUP_STATES,
  MESSAGE_EVENT_TYPES,
  MESSAGE_STATUSES,
  SUPPRESSION_REASONS,
} from "@/lib/outreach/constants";

export const sendWindowSchema = z.object({
  days: z.array(z.number().int().min(1).max(7)).min(1),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
});

export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export const enrollmentStatusSchema = z.enum(ENROLLMENT_STATUSES);
export const mailboxWarmupStateSchema = z.enum(MAILBOX_WARMUP_STATES);
export const messageStatusSchema = z.enum(MESSAGE_STATUSES);
export const messageEventTypeSchema = z.enum(MESSAGE_EVENT_TYPES);
export const suppressionReasonSchema = z.enum(SUPPRESSION_REASONS);

export const leadInputSchema = z.object({
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.email(),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  website: z.url().optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  linkedinUrl: z.url().optional().or(z.literal("")),
  status: leadStatusSchema.default("NEW"),
  tags: z.array(z.string().trim().min(1).max(50)).default([]),
  customFields: z.record(z.string(), z.string()).default({}),
});

export const mailboxInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  fromEmail: z.email(),
  fromName: z.string().trim().min(2).max(100),
  replyTo: z.email().optional().or(z.literal("")),
  dailyCap: z.coerce.number().int().min(1).max(1000),
  timezone: z.string().trim().min(1).max(80).default("Europe/Bucharest"),
  warmupState: mailboxWarmupStateSchema.default("COLD"),
  isActive: z.coerce.boolean().default(true),
  sendWindow: sendWindowSchema,
});

export const campaignInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  mailboxId: z.string().trim().min(1),
  timezone: z.string().trim().min(1).max(80).default("Europe/Bucharest"),
  dailyLimit: z.coerce.number().int().min(1).max(1000),
  sendWindow: sendWindowSchema,
});

export const sequenceStepInputSchema = z.object({
  campaignId: z.string().trim().min(1),
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10),
  delayDaysMin: z.coerce.number().int().min(0).max(30),
  delayDaysMax: z.coerce.number().int().min(0).max(45),
  stopOnReply: z.coerce.boolean().default(true),
});

export const leadNoteInputSchema = z.object({
  leadId: z.string().trim().min(1),
  content: z.string().trim().min(2).max(2000),
});

export const campaignEnrollmentInputSchema = z.object({
  campaignId: z.string().trim().min(1),
  leadIds: z.array(z.string().trim().min(1)).min(1),
});

export const importRequestSchema = z.object({
  csvText: z.string().min(1),
  fileName: z.string().trim().max(255).optional(),
  mode: z.enum(["preview", "import"]).default("preview"),
  defaultTags: z.array(z.string().trim().min(1).max(50)).default([]),
});
