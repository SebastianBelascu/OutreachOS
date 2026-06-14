import type { Lead, SequenceStep } from "@prisma/client";

import { absoluteUrl } from "@/lib/utils";
import { createSeededRng } from "@/lib/outreach/format";
import { buildLeadTemplateParams } from "@/lib/outreach/variables";

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
// Innermost spintax group — must contain a pipe so it never matches a {{ var }} token.
const SPINTAX_PATTERN = /\{([^{}]*\|[^{}]*)\}/g;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Resolves spintax {a|b|c} groups deterministically for a given seed, innermost-first
 * (so nesting works). Same seed + template always yields the same output.
 */
export function renderSpintax(template: string, seed: string) {
  const rng = createSeededRng(seed);
  let output = template;
  let guard = 0;

  while (SPINTAX_PATTERN.test(output) && guard < 1000) {
    SPINTAX_PATTERN.lastIndex = 0;
    output = output.replace(SPINTAX_PATTERN, (_, group: string) => {
      const options = group.split("|");
      const index = Math.floor(rng() * options.length);
      return options[index] ?? "";
    });
    guard += 1;
  }

  return output;
}

export { buildLeadTemplateParams };

export function renderTemplate(template: string, params: Record<string, string>) {
  return template.replace(TOKEN_PATTERN, (_, key: string) => params[key] ?? "");
}

/**
 * Tidies whitespace left behind when an optional variable (e.g. {{observation}})
 * resolves to an empty string: trailing spaces are stripped and 3+ consecutive
 * newlines collapse to a single blank line, so the email never shows an awkward gap.
 */
export function collapseBlankLines(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderSequenceMessage(
  step: Pick<SequenceStep, "subject" | "body">,
  lead: Lead,
  unsubscribeToken: string,
) {
  const params = buildLeadTemplateParams(lead);
  // Variables first, then spintax — the spintax pattern requires a pipe so it never
  // collides with {{ tokens }}. Seed with the per-message token for stable randomization.
  const subject = renderSpintax(renderTemplate(step.subject, params), `${unsubscribeToken}:subject`).trim();
  const body = collapseBlankLines(
    renderSpintax(renderTemplate(step.body, params), `${unsubscribeToken}:body`),
  );
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
