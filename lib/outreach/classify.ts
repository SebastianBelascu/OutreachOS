import type { InboundClassification } from "@prisma/client";

export interface ClassifyInput {
  fromEmail: string;
  subject?: string | null;
  text: string;
  headers?: Record<string, string | undefined>;
}

/** Lowercases and strips Romanian diacritics so patterns match either spelling. */
function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/ș|ş/g, "s")
    .replace(/ț|ţ/g, "t");
}

/**
 * Rule-based classifier for inbound replies (RO + EN). Order matters: bounces and
 * automated mail are detected before human intent so an out-of-office never flips a
 * lead to REPLIED.
 */
export function classifyInbound(input: ClassifyInput): InboundClassification {
  const from = input.fromEmail.toLowerCase();
  const subject = normalize(input.subject ?? "");
  const body = normalize(input.text ?? "");
  const blob = `${subject}\n${body}`;
  const headers = input.headers ?? {};

  // Delivery failure notifications.
  if (
    /(mailer-daemon|postmaster)@/.test(from) ||
    /(undeliverable|delivery status notification|mail delivery (failed|subsystem)|returned mail|failure notice|delivery has failed)/.test(
      blob,
    )
  ) {
    return "BOUNCE_NOTIFICATION";
  }

  // Explicit opt-out requests take priority over any positive/negative read.
  if (/(unsubscribe|dezabon|scoate[ -]?ma|scoateti[ -]?ma|stop email|remove me|nu imi mai trimite)/.test(blob)) {
    return "UNSUBSCRIBE_REQUEST";
  }

  // Out-of-office (a kind of auto reply we surface separately).
  if (/(out of office|out-of-office|away from (the )?office|on vacation|raspuns automat|in concediu|sunt plecat|revin pe)/.test(blob)) {
    return "OUT_OF_OFFICE";
  }

  // Generic automated replies via headers or common markers.
  const autoSubmitted = (headers["auto-submitted"] ?? "").toLowerCase();
  const precedence = (headers["precedence"] ?? "").toLowerCase();
  if (
    (autoSubmitted && autoSubmitted !== "no") ||
    headers["x-autoreply"] ||
    headers["x-autorespond"] ||
    precedence === "auto_reply" ||
    /(automatic reply|auto[- ]?reply|this is an automated)/.test(blob)
  ) {
    return "AUTO_REPLY";
  }

  if (
    /(not interested|no thanks|no thank you|please remove|nu (ne|ma|imi) interes|nu sunt interesat|nu suntem interesati|nu multumesc|fara multumesc)/.test(
      blob,
    )
  ) {
    return "NOT_INTERESTED";
  }

  if (
    /(interested|sounds good|let's|lets talk|set up a|book a|schedule|calendly|happy to|tell me more|send (me )?(more|details)|how much|pricing|quote|call|meeting|demo|pret|oferta|detalii|cat costa|cand putem|programa|suna|hai sa)/.test(
      blob,
    )
  ) {
    return "INTERESTED";
  }

  return "NEUTRAL";
}
