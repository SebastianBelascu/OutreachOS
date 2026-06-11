import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/outreach/cron-auth";
import { dispatchDueMessages } from "@/lib/outreach/messages";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const summary = await dispatchDueMessages();
  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
