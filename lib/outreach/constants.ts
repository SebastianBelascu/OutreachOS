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

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;
