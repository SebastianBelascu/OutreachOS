import type { Lead, SequenceStep } from "@prisma/client";

import { absoluteUrl } from "@/lib/utils";

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fallbackValue(value?: string | null) {
  return value && value.trim().length > 0 ? value : "there";
}

export function buildLeadTemplateParams(lead: Lead) {
  return {
    first_name: fallbackValue(lead.firstName),
    last_name: fallbackValue(lead.lastName),
    company: fallbackValue(lead.company),
    website: fallbackValue(lead.website),
    industry: fallbackValue(lead.industry),
    country: fallbackValue(lead.country),
    linkedin_url: fallbackValue(lead.linkedinUrl),
    email: lead.email,
  };
}

export function renderTemplate(template: string, params: Record<string, string>) {
  return template.replace(TOKEN_PATTERN, (_, key: string) => params[key] ?? "");
}

export function renderSequenceMessage(
  step: Pick<SequenceStep, "subject" | "body">,
  lead: Lead,
  unsubscribeToken: string,
) {
  const params = buildLeadTemplateParams(lead);
  const subject = renderTemplate(step.subject, params);
  const body = renderTemplate(step.body, params);
  const unsubscribeUrl = absoluteUrl(`/unsubscribe/${unsubscribeToken}`);

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#171717">
      <div>${body.replace(/\n/g, "<br />")}</div>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5" />
      <p style="font-size:12px;color:#737373">
        If this is not relevant, you can
        <a href="${unsubscribeUrl}">unsubscribe here</a>.
      </p>
    </div>
  `.trim();

  const previewHtml = `
    <div class="space-y-4">
      <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rendered preview</p>
      <div class="rounded-2xl border border-border/80 bg-background/80 p-5 text-sm leading-7">
        ${escapeHtml(body).replace(/\n/g, "<br />")}
      </div>
      <p class="text-xs text-muted-foreground">Opt-out link will be injected automatically on send.</p>
    </div>
  `.trim();

  return {
    subject,
    htmlBody,
    previewHtml,
  };
}
