export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "OPENED",
  "REPLIED",
  "INTERESTED",
  "MEETING_BOOKED",
  "NOT_INTERESTED",
  "BOUNCED",
] as const;

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
] as const;

export const ENROLLMENT_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "STOPPED",
  "SUPPRESSED",
] as const;

export const MAILBOX_WARMUP_STATES = [
  "COLD",
  "WARMING",
  "ACTIVE",
  "PAUSED",
] as const;

export const SENDING_DOMAIN_STATUSES = [
  "NEEDS_SETUP",
  "AUTHENTICATING",
  "READY",
  "RISK",
  "PAUSED",
] as const;

export const SENDING_DOMAIN_PURPOSES = [
  "OUTREACH",
  "BRAND",
  "INTERNAL",
] as const;

export const MAILBOX_PROVIDERS = [
  "BREVO_HOSTED",
  "EMAIL_HOST",
  "GOOGLE_WORKSPACE",
  "MICROSOFT_365",
  "OTHER",
] as const;

export const MAILBOX_HEALTH_STATUSES = [
  "UNVERIFIED",
  "HEALTHY",
  "WARNING",
  "UNHEALTHY",
  "PAUSED",
] as const;

export const MAILBOX_CONNECTION_STATUSES = [
  "NOT_CONFIGURED",
  "READY",
  "ERROR",
] as const;

export const MESSAGE_STATUSES = [
  "SCHEDULED",
  "CLAIMED",
  "SENT",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "BOUNCED",
  "FAILED",
  "SUPPRESSED",
  "CANCELLED",
] as const;

export const MESSAGE_EVENT_TYPES = [
  "SENT",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "SOFT_BOUNCE",
  "HARD_BOUNCE",
  "INVALID",
  "DEFERRED",
  "COMPLAINT",
  "UNSUBSCRIBED",
  "BLOCKED",
  "ERROR",
] as const;

export const SUPPRESSION_REASONS = [
  "UNSUBSCRIBED",
  "HARD_BOUNCE",
  "COMPLAINT",
  "MANUAL_BLOCK",
  "INVALID_EMAIL",
] as const;

export const INBOUND_CLASSIFICATIONS = [
  "UNCLASSIFIED",
  "INTERESTED",
  "NOT_INTERESTED",
  "OUT_OF_OFFICE",
  "AUTO_REPLY",
  "BOUNCE_NOTIFICATION",
  "UNSUBSCRIBE_REQUEST",
  "NEUTRAL",
] as const;

export const INBOUND_CLASSIFICATION_LABELS: Record<(typeof INBOUND_CLASSIFICATIONS)[number], string> = {
  UNCLASSIFIED: "Unclassified",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not interested",
  OUT_OF_OFFICE: "Out of office",
  AUTO_REPLY: "Auto-reply",
  BOUNCE_NOTIFICATION: "Bounce",
  UNSUBSCRIBE_REQUEST: "Unsubscribe",
  NEUTRAL: "Neutral",
};

export const LEAD_PRIORITIES = ["A", "B", "C"] as const;

export const CAMPAIGN_OFFERS = [
  "AI SEO Infrastructure",
  "AI Follow-Up Engine",
  "Conversion Infrastructure",
  "Workflow Automation Sprint",
  "AI SDR Infrastructure",
] as const;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;
