import { z } from "zod";

import {
  CAMPAIGN_STATUSES,
  ENROLLMENT_STATUSES,
  INBOUND_CLASSIFICATIONS,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  MAILBOX_CONNECTION_STATUSES,
  MAILBOX_HEALTH_STATUSES,
  MAILBOX_PROVIDERS,
  MAILBOX_WARMUP_STATES,
  MESSAGE_EVENT_TYPES,
  MESSAGE_STATUSES,
  SENDING_DOMAIN_PURPOSES,
  SENDING_DOMAIN_STATUSES,
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
export const sendingDomainStatusSchema = z.enum(SENDING_DOMAIN_STATUSES);
export const sendingDomainPurposeSchema = z.enum(SENDING_DOMAIN_PURPOSES);
export const mailboxProviderSchema = z.enum(MAILBOX_PROVIDERS);
export const mailboxHealthStatusSchema = z.enum(MAILBOX_HEALTH_STATUSES);
export const mailboxConnectionStatusSchema = z.enum(MAILBOX_CONNECTION_STATUSES);
export const messageStatusSchema = z.enum(MESSAGE_STATUSES);
export const messageEventTypeSchema = z.enum(MESSAGE_EVENT_TYPES);
export const suppressionReasonSchema = z.enum(SUPPRESSION_REASONS);
export const inboundClassificationSchema = z.enum(INBOUND_CLASSIFICATIONS);
export const leadPrioritySchema = z.enum(LEAD_PRIORITIES);

export const sendingDomainInputSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(180)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/),
  provider: z.string().trim().max(100).optional().or(z.literal("")),
  hostLabel: z.string().trim().max(100).optional().or(z.literal("")),
  purpose: sendingDomainPurposeSchema.default("OUTREACH"),
  status: sendingDomainStatusSchema.default("NEEDS_SETUP"),
  isPrimary: z.coerce.boolean().default(false),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

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
  bestOffer: z.string().trim().max(120).optional().or(z.literal("")),
  priority: leadPrioritySchema.optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).default([]),
  customFields: z.record(z.string(), z.string()).default({}),
});

export const mailboxInputSchema = z.object({
  domainId: z.string().trim().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(100),
  fromEmail: z.email(),
  fromName: z.string().trim().min(2).max(100),
  provider: mailboxProviderSchema.default("EMAIL_HOST"),
  hostLabel: z.string().trim().max(100).optional().or(z.literal("")),
  localPart: z.string().trim().max(100).optional().or(z.literal("")),
  replyTo: z.email().optional().or(z.literal("")),
  dailyCap: z.coerce.number().int().min(1).max(1000),
  rampStart: z.coerce.number().int().min(1).max(500).default(5),
  rampIncrement: z.coerce.number().int().min(0).max(250).default(5),
  maxDailyCap: z.coerce.number().int().min(1).max(1000).default(50),
  rotationWeight: z.coerce.number().int().min(1).max(100).default(1),
  timezone: z.string().trim().min(1).max(80).default("Europe/Bucharest"),
  warmupState: mailboxWarmupStateSchema.default("COLD"),
  healthStatus: mailboxHealthStatusSchema.default("UNVERIFIED"),
  hourlyCap: z.coerce.number().int().min(1).max(200).default(8),
  sendTransport: z.enum(["BREVO", "SMTP"]).default("SMTP"),
  smtpHost: z.string().trim().max(180).optional().or(z.literal("")),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpSecure: z.coerce.boolean().default(false),
  smtpUsername: z.string().trim().max(180).optional().or(z.literal("")),
  smtpPassword: z.string().max(500).optional().or(z.literal("")),
  imapHost: z.string().trim().max(180).optional().or(z.literal("")),
  imapUsername: z.string().trim().max(180).optional().or(z.literal("")),
  imapPort: z.coerce.number().int().min(1).max(65535).default(993),
  imapPassword: z.string().max(500).optional().or(z.literal("")),
  connectionStatus: mailboxConnectionStatusSchema.default("NOT_CONFIGURED"),
  isActive: z.coerce.boolean().default(true),
  sendWindow: sendWindowSchema,
});

export const campaignInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  mailboxId: z.string().trim().min(1),
  mailboxIds: z.array(z.string().trim().min(1)).default([]),
  timezone: z.string().trim().min(1).max(80).default("Europe/Bucharest"),
  dailyLimit: z.coerce.number().int().min(1).max(1000),
  rampEnabled: z.coerce.boolean().default(false),
  rampStart: z.coerce.number().int().min(1).max(1000).default(10),
  rampIncrement: z.coerce.number().int().min(0).max(500).default(5),
  sendWindow: sendWindowSchema,
});

// Post-creation edits. Timezone + send window drive when the scheduler is allowed
// to send; daily limit caps campaign volume. Kept separate from the create schema
// so editing settings never touches mailbox pool / ramp wiring.
export const campaignSettingsSchema = z.object({
  campaignId: z.string().trim().min(1),
  timezone: z.string().trim().min(1).max(80),
  dailyLimit: z.coerce.number().int().min(1).max(1000),
  sendWindow: sendWindowSchema,
});

export const mailboxSettingsSchema = z.object({
  mailboxId: z.string().trim().min(1),
  timezone: z.string().trim().min(1).max(80),
  sendWindow: sendWindowSchema,
  isActive: z.coerce.boolean().default(true),
  healthStatus: mailboxHealthStatusSchema,
  warmupState: mailboxWarmupStateSchema,
  dailyCap: z.coerce.number().int().min(1).max(1000),
  maxDailyCap: z.coerce.number().int().min(1).max(1000),
  hourlyCap: z.coerce.number().int().min(1).max(200),
  rampStart: z.coerce.number().int().min(1).max(500),
  rampIncrement: z.coerce.number().int().min(0).max(250),
  rotationWeight: z.coerce.number().int().min(1).max(100),
});

export const sequenceStepInputSchema = z.object({
  campaignId: z.string().trim().min(1),
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10),
  delayDaysMin: z.coerce.number().int().min(0).max(30),
  delayDaysMax: z.coerce.number().int().min(0).max(45),
  stopOnReply: z.coerce.boolean().default(true),
});

export const sequenceStepUpdateSchema = z.object({
  stepId: z.string().trim().min(1),
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10),
  delayDaysMin: z.coerce.number().int().min(0).max(30),
  delayDaysMax: z.coerce.number().int().min(0).max(45),
  stopOnReply: z.coerce.boolean().default(true),
});

export const sequenceStepVariantInputSchema = z.object({
  sequenceStepId: z.string().trim().min(1),
  label: z.string().trim().min(1).max(8),
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10),
  weight: z.coerce.number().int().min(1).max(100).default(1),
  isActive: z.coerce.boolean().default(true),
});

export const createCampaignFromTemplateSchema = z.object({
  templateId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  mailboxId: z.string().trim().min(1),
  mailboxIds: z.array(z.string().trim().min(1)).default([]),
  timezone: z.string().trim().min(1).max(80).default("Europe/Bucharest"),
  dailyLimit: z.coerce.number().int().min(1).max(1000).default(30),
  sendWindow: sendWindowSchema.optional(),
});

export const inboxReplyInputSchema = z.object({
  inboundMessageId: z.string().trim().min(1),
  body: z.string().trim().min(1).max(20000),
});

export const inboxFilterSchema = z.object({
  mailboxId: z.string().trim().optional(),
  campaignId: z.string().trim().optional(),
  classification: inboundClassificationSchema.optional(),
  unreadOnly: z.coerce.boolean().optional(),
  search: z.string().trim().max(200).optional(),
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
  columnMapping: z.record(z.string(), z.string()).default({}),
});
