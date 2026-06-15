import type { Lead } from "@prisma/client";

export const LEAD_VARIABLES = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "company", label: "Company" },
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "email", label: "Email" },
  { key: "best_offer", label: "Best offer" },
  { key: "priority", label: "Priority" },
  { key: "first_line", label: "First line (lead-hub)" },
  { key: "observation", label: "Observation (lead-hub)" },
  { key: "entry_offer", label: "Entry offer (lead-hub)" },
] as const;

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// Personalization variables the operator writes/imports per lead. When a sequence
// references one but the lead has no value, the lead is HELD (not emailed) instead of
// receiving a half-empty message — see findMissingPersonalization + scheduleEnrollmentMessages.
export const REQUIRED_PERSONALIZATION_VARIABLES = ["first_line", "company"] as const;

// Mailbox-style local parts that are roles, not people — never treat as a first name.
const GENERIC_LOCAL_PARTS = new Set([
  "info", "office", "contact", "hello", "hi", "sales", "support", "admin", "team",
  "marketing", "noreply", "no-reply", "newsletter", "help", "jobs", "hr", "press",
  "billing", "accounts", "account", "service", "services", "enquiries", "inquiries",
  "mail", "email", "general", "reception", "booking", "bookings", "orders", "order",
  "ceo", "founder", "hq", "company", "business", "shop", "store",
]);

function fallbackValue(value?: string | null, fallback = "there") {
  return value && value.trim().length > 0 ? value : fallback;
}

/**
 * Best-effort first name from an email local-part, used only when the lead has no
 * firstName. `andrei.popescu@x.ro` -> "Andrei"; `john+promo@x.com` -> "John";
 * role inboxes (`office@`, `contact@`) and bare initials return null so the caller
 * can fall back to a neutral greeting.
 */
export function firstNameFromEmail(email?: string | null): string | null {
  const local = email?.split("@")[0]?.toLowerCase().trim();
  if (!local) return null;
  const base = local.split("+")[0];
  if (GENERIC_LOCAL_PARTS.has(base)) return null;
  const firstChunk = base.split(/[._\-]+/).find((part) => /[a-z]/i.test(part));
  const cleaned = firstChunk?.replace(/[^a-z]/gi, "") ?? "";
  if (cleaned.length < 2) return null; // skip initials like "j"
  if (GENERIC_LOCAL_PARTS.has(cleaned)) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function customFieldsFromLead(lead: Pick<Lead, "customFields">) {
  if (!lead.customFields || typeof lead.customFields !== "object" || Array.isArray(lead.customFields)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(lead.customFields)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => [key, String(value)]),
  );
}

export function extractTemplateVariables(template: string) {
  return [...template.matchAll(TOKEN_PATTERN)].map((match) => match[1]);
}

export function uniqueTemplateVariables(template: string) {
  return [...new Set(extractTemplateVariables(template))];
}

export function buildLeadTemplateParams(lead: Lead): Record<string, string> {
  const customFields = customFieldsFromLead(lead);
  return {
    ...customFields,
    first_name: fallbackValue(lead.firstName ?? firstNameFromEmail(lead.email)),
    last_name: fallbackValue(lead.lastName, ""),
    company: fallbackValue(lead.company, ""),
    website: fallbackValue(lead.website, ""),
    industry: fallbackValue(lead.industry, ""),
    country: fallbackValue(lead.country, ""),
    linkedin_url: fallbackValue(lead.linkedinUrl, ""),
    email: lead.email,
    best_offer: fallbackValue(lead.bestOffer ?? (customFields.offer_angle as string | undefined), ""),
    priority: fallbackValue(lead.priority, ""),
  };
}

export function findMissingTemplateVariables(template: string, params: Record<string, string>) {
  return uniqueTemplateVariables(template).filter((key) => !params[key]);
}

/**
 * Required personalization variables that `template` references but this lead can't
 * fill (empty/whitespace). A non-empty result means the lead should be held back from
 * sending until the operator adds the personalization. Optional variables (e.g.
 * {{observation}}) are intentionally ignored — those are cleaned up at render time.
 */
export function findMissingPersonalization(template: string, params: Record<string, string>) {
  const used = new Set(uniqueTemplateVariables(template));
  return REQUIRED_PERSONALIZATION_VARIABLES.filter(
    (key) => used.has(key) && !(params[key] && params[key].trim().length > 0),
  );
}
