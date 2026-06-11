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

function fallbackValue(value?: string | null, fallback = "there") {
  return value && value.trim().length > 0 ? value : fallback;
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
    first_name: fallbackValue(lead.firstName),
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
