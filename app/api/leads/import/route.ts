import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/outreach/auth";
import { importLeadsFromCsv } from "@/lib/outreach/leads";

// A 120-row import upserts ~120 leads plus tag links; the 10s default left no margin
// and could time out mid-loop, committing only some rows. Match the cron routes' headroom.
export const maxDuration = 60;

export async function POST(request: Request) {
  const appUser = await requireAppUser();
  if (!appUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = (await request.json()) as unknown;
  const result = await importLeadsFromCsv(payload, appUser.id);
  return NextResponse.json(result);
}
