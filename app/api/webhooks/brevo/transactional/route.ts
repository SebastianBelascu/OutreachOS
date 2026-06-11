import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";
import { processTransactionalWebhook } from "@/lib/outreach/messages";
import type { BrevoTransactionalWebhookPayload } from "@/lib/outreach/brevo";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const env = getServerEnv();

  if (authorization !== `Bearer ${env.brevoWebhookBearerToken}`) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  const payload = (await request.json()) as BrevoTransactionalWebhookPayload;
  const event = await processTransactionalWebhook(payload);

  return NextResponse.json({ ok: true, eventId: event?.id ?? null });
}
