import { NextResponse } from "next/server";

import { unsubscribeMessageByToken } from "@/lib/outreach/messages";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * RFC 8058 one-click unsubscribe endpoint. Mail clients POST here (without rendering
 * the human page) when the user clicks the native "unsubscribe" button.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { token } = await params;
  await unsubscribeMessageByToken(token);
  return NextResponse.json({ ok: true });
}
