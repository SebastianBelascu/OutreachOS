import type {
  CampaignStatus,
  EnrollmentStatus,
  LeadStatus,
  MailboxWarmupState,
  MessageEventType,
  MessageStatus,
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
  errors: string[];
  columns: string[];
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
  skippedCount: number;
  runId: string;
}

export interface AppWorkspaceStats {
  leads: number;
  activeCampaigns: number;
  activeMailboxes: number;
  scheduledMessages: number;
}

export type BusinessStatus =
  | LeadStatus
  | CampaignStatus
  | EnrollmentStatus
  | MailboxWarmupState
  | MessageStatus
  | MessageEventType
  | SuppressionReason;
