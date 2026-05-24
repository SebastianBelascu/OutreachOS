import { NextResponse } from "next/server";

import { sendClaimedMessages } from "@/lib/outreach/messages";

function isAuthorizedCron(request: Request) {
  return process.env.NODE_ENV === "development" || request.headers.has("x-vercel-cron");
}

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const summary = await sendClaimedMessages();
  return NextResponse.json(summary);
}
