import OpenAI from "openai";
import type { InboundClassification, Lead } from "@prisma/client";

/**
 * Thin OpenAI wrapper for the two AI touch-points in the outreach engine:
 *   1. generateFirstLine  — writes the per-lead personalization opener ({{first_line}})
 *   2. classifyInboundWithAi — sharpens the rule-based inbound classifier on the
 *      ambiguous human-sentiment buckets (interested / not / neutral)
 *
 * Both degrade gracefully: with no OPENAI_API_KEY (or on any API error) they return
 * null, and the caller falls back to its non-AI path. Nothing here ever throws.
 */

const GENERATION_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const CLASSIFY_MODEL = process.env.OPENAI_CLASSIFY_MODEL?.trim() || "gpt-4o-mini";

let cached: OpenAI | null = null;

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!cached) cached = new OpenAI({ apiKey });
  return cached;
}

function looksRomanian(lead: Pick<Lead, "country">) {
  const country = lead.country?.trim().toLowerCase() ?? "";
  return country === "ro" || country === "rou" || country.includes("roman");
}

/** Short, model-friendly summary of everything we know about a lead. */
function buildLeadContext(lead: GenerationLead): string {
  const lines: string[] = [];
  const push = (label: string, value?: string | null) => {
    if (value && value.trim().length > 0) lines.push(`${label}: ${value.trim()}`);
  };

  push("Company", lead.company);
  push("Website", lead.website);
  push("Industry", lead.industry);
  push("Country", lead.country);
  push("Contact first name", lead.firstName);
  push("Offer we pitch", lead.bestOffer);

  if (lead.customFields && typeof lead.customFields === "object" && !Array.isArray(lead.customFields)) {
    for (const [key, value] of Object.entries(lead.customFields)) {
      // first_line is what we're generating; skip it and any non-string noise.
      if (key === "first_line" || typeof value !== "string" || value.trim().length === 0) continue;
      push(key.replaceAll("_", " "), value);
    }
  }

  return lines.join("\n");
}

type GenerationLead = Pick<
  Lead,
  "firstName" | "company" | "website" | "industry" | "country" | "bestOffer" | "customFields"
>;

/**
 * Generates a single personalized opening sentence for a lead. Returns the line, or
 * null when AI is unconfigured, the lead is too thin to personalize, or the call fails.
 * The line is plain text with no greeting/sign-off — it slots into {{first_line}}.
 */
export async function generateFirstLine(lead: GenerationLead): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const context = buildLeadContext(lead);
  // Without at least a company or website there's nothing specific to say.
  if (!lead.company?.trim() && !lead.website?.trim()) return null;

  const language = looksRomanian(lead) ? "Romanian" : "English";

  try {
    const completion = await client.chat.completions.create({
      model: GENERATION_MODEL,
      temperature: 0.7,
      max_tokens: 160,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write the opening personalization line of a cold outreach email. " +
            "Return JSON: {\"first_line\": string}. Rules: " +
            `write in ${language}; ` +
            "ONE sentence, max ~30 words; " +
            "specific to THIS company (reference what they do), never generic filler; " +
            "no greeting, no name, no sign-off, no emojis, plain text; " +
            "sound like a human who looked at their business, not a template; " +
            "if there is not enough information to say something specific, return an empty string for first_line.",
        },
        {
          role: "user",
          content: `Lead details:\n${context}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { first_line?: unknown };
    const line = typeof parsed.first_line === "string" ? parsed.first_line.trim() : "";
    return line.length > 0 ? line : null;
  } catch {
    return null;
  }
}

const AI_SENTIMENT: InboundClassification[] = ["INTERESTED", "NOT_INTERESTED", "NEUTRAL"];

/**
 * Classifies the sentiment of a human reply into INTERESTED / NOT_INTERESTED / NEUTRAL.
 * Intentionally scoped to those three — bounces, out-of-office, auto-replies and
 * unsubscribe requests stay rule-based (reliable + side-effect-bearing). Returns null
 * when AI is unconfigured or the call fails, so the caller keeps the rule-based verdict.
 */
export async function classifyInboundWithAi(input: {
  subject?: string | null;
  text: string;
}): Promise<InboundClassification | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: CLASSIFY_MODEL,
      temperature: 0,
      max_tokens: 20,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You classify the sentiment of a reply to a cold sales email. " +
            'Return JSON: {"classification": "INTERESTED" | "NOT_INTERESTED" | "NEUTRAL"}. ' +
            "INTERESTED = wants to talk, asks for info/pricing/a call, or is positive. " +
            "NOT_INTERESTED = declines, says no, or asks to stop being contacted. " +
            "NEUTRAL = anything else (questions without intent, referrals, unclear). " +
            "Replies may be in Romanian or English.",
        },
        {
          role: "user",
          content: `Subject: ${input.subject ?? "(none)"}\n\nReply:\n${input.text.slice(0, 4000)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { classification?: unknown };
    const value = typeof parsed.classification === "string" ? parsed.classification.toUpperCase() : "";
    return AI_SENTIMENT.includes(value as InboundClassification)
      ? (value as InboundClassification)
      : null;
  } catch {
    return null;
  }
}
