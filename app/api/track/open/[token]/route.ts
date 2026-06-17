import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildEventKey } from "@/lib/outreach/format";

// 1x1 transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/** Records the first open for a message; safe to call repeatedly (deduped). */
async function recordOpen(token: string) {
  const message = await prisma.outboundMessage.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, status: true, openedAt: true, leadId: true, campaignId: true, providerMessageId: true },
  });
  if (!message) {
    return;
  }

  const now = new Date();

  if (!message.openedAt) {
    await prisma.outboundMessage.update({
      where: { id: message.id },
      data: {
        openedAt: now,
        // Advance the funnel only from SENT/DELIVERED — never downgrade CLICKED.
        ...(["SENT", "DELIVERED"].includes(message.status) ? { status: "OPENED" as const } : {}),
      },
    });

    const lead = await prisma.lead.findUnique({ where: { id: message.leadId }, select: { status: true } });
    if (lead && ["NEW", "CONTACTED"].includes(lead.status)) {
      await prisma.lead.update({ where: { id: message.leadId }, data: { status: "OPENED" } });
    }
  }

  // One OPENED event per message — a stable eventKey dedupes the repeated pixel loads
  // that Apple/Gmail image prefetch produces.
  try {
    await prisma.emailEvent.create({
      data: {
        eventKey: buildEventKey("OPENED", message.providerMessageId ?? message.id, "pixel"),
        eventType: "OPENED",
        providerMessageId: message.providerMessageId ?? null,
        payload: { source: "pixel" } as unknown as Prisma.InputJsonValue,
        occurredAt: now,
        outboundMessageId: message.id,
        campaignId: message.campaignId,
        leadId: message.leadId,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    await recordOpen(token);
  } catch {
    // Tracking is best-effort — always return the pixel so the email renders cleanly.
  }

  return new Response(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}
