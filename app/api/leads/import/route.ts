import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/outreach/auth";
import { importLeadsFromCsv } from "@/lib/outreach/leads";

export async function POST(request: Request) {
  const appUser = await requireAppUser();
  if (!appUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = (await request.json()) as unknown;
  const result = await importLeadsFromCsv(payload, appUser.id);
  return NextResponse.json(result);
}
