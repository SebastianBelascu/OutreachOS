import type {
  CampaignStatus,
  EnrollmentStatus,
  LeadPriority,
  LeadStatus,
  MailboxConnectionStatus,
  MailboxHealthStatus,
  MailboxProvider,
  MailboxWarmupState,
  MessageEventType,
  MessageStatus,
  SendingDomainPurpose,
  SendingDomainStatus,
  SuppressionReason,
} from "@prisma/client";

export interface SendWindow {
  days: number[];
  startHour: number;
  endHour: number;
}

export interface LeadImportPreviewRow {
  rowNumber: number;
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
  website?: string;
  industry?: string;
  country?: string;
  linkedinUrl?: string;
  status: LeadStatus;
  bestOffer?: string;
  priority?: LeadPriority;
  tags: string[];
  customFields: Record<string, string>;
  dedupeKey: string;
}

export interface LeadImportSummary {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  importedRows: number;
  updatedRows: number;
  invalidRows: number;
  skippedRows: number;
  detectedFormat?: string;
  errors: string[];
  columns: string[];
  mappedColumns?: Record<string, string>;
  preview: LeadImportPreviewRow[];
}

export interface AnalyticsSnapshot {
  totals: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    activeCampaigns: number;
    totalLeads: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
}

export interface DispatchSummary {
  claimedCount: number;
  skippedCount: number;
  runId: string;
}

export interface SendSummary {
  sentCount: number;
  failedCount: number;
  retriedCount: number;
  skippedCount: number;
  runId: string;
}

export interface AppWorkspaceStats {
  leads: number;
  activeCampaigns: number;
  activeMailboxes: number;
  scheduledMessages: number;
}

export interface SetupStep {
  key: string;
  label: string;
  description: string;
  complete: boolean;
  href: string;
  actionLabel: string;
}

export interface CommandCenterSnapshot {
  readinessScore: number;
  setupSteps: SetupStep[];
  nextAction: SetupStep;
  capacityToday: {
    available: number;
    total: number;
    used: number;
  };
  blockers: {
    domains: number;
    mailboxes: number;
    campaigns: number;
  };
}

export interface DailySendingPoint {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
}

export interface FunnelPoint {
  stage: string;
  value: number;
}

export interface InboxCapacityPoint {
  inbox: string;
  used: number;
  remaining: number;
  cap: number;
  health: string;
}

export interface DomainReadinessPoint {
  domain: string;
  ready: number;
  blocked: number;
  status: string;
}

export interface VariantPerformanceRow {
  sequenceStepId: string;
  stepOrder: number;
  variantId: string | null;
  label: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

export interface DeliverabilityAlert {
  kind: "mailbox" | "campaign" | "domain";
  severity: "warning" | "critical";
  label: string;
  detail: string;
  href: string;
}

export interface CampaignProgressSnapshot {
  sequenceReady: boolean;
  leadsReady: boolean;
  launchReady: boolean;
  sendingStarted: boolean;
  progressPercent: number;
  blockers: string[];
}

export type BusinessStatus =
  | LeadStatus
  | CampaignStatus
  | EnrollmentStatus
  | SendingDomainStatus
  | SendingDomainPurpose
  | MailboxProvider
  | MailboxHealthStatus
  | MailboxConnectionStatus
  | MailboxWarmupState
  | MessageStatus
  | MessageEventType
  | SuppressionReason;
