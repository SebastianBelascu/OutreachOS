import { Prisma } from "@prisma/client";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/outreach/crypto";
import { normalizeEmail } from "@/lib/outreach/format";
import { ingestInboundMessage, type RawInboundMessage } from "@/lib/outreach/inbound";

const FETCH_CAP = 50;
const INITIAL_WINDOW = 50;

type MailboxImapConfig = {
  id: string;
  fromEmail: string;
  imapHost: string | null;
  imapUsername: string | null;
  imapPort: number;
  imapTls: boolean;
  imapPasswordEnc: string | null;
  imapLastUid: number | null;
  imapUidValidity: bigint | null;
};

function buildClient(mailbox: MailboxImapConfig, password: string) {
  return new ImapFlow({
    host: mailbox.imapHost as string,
    port: mailbox.imapPort,
    secure: mailbox.imapTls,
    auth: {
      user: mailbox.imapUsername as string,
      pass: password,
    },
    logger: false,
    emitLogs: false,
  });
}

function headerString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

/** Tests IMAP credentials by connecting and logging out. Updates connectionStatus. */
export async function testMailboxConnection(mailboxId: string) {
  const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mailbox || !mailbox.imapHost || !mailbox.imapUsername || !mailbox.imapPasswordEnc) {
    return { ok: false, error: "IMAP is not configured for this mailbox." };
  }

  try {
    const client = buildClient(mailbox, decryptSecret(mailbox.imapPasswordEnc));
    await client.connect();
    await client.logout();
    await prisma.mailbox.update({
      where: { id: mailboxId },
      data: { connectionStatus: "READY", imapLastError: null },
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "IMAP connection failed.";
    await prisma.mailbox.update({
      where: { id: mailboxId },
      data: { connectionStatus: "ERROR", imapLastError: message },
    });
    return { ok: false, error: message };
  }
}

/** Pulls new messages from one mailbox's INBOX and ingests replies. */
export async function syncMailboxInbox(mailboxId: string) {
  const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mailbox || !mailbox.imapHost || !mailbox.imapUsername || !mailbox.imapPasswordEnc) {
    return { mailboxId, ingested: 0, skipped: 0, error: "not_configured" };
  }

  const selfEmail = normalizeEmail(mailbox.fromEmail);
  let ingested = 0;
  let skipped = 0;
  let client: ImapFlow | null = null;

  try {
    client = buildClient(mailbox, decryptSecret(mailbox.imapPasswordEnc));
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const status =
        typeof client.mailbox === "object" && client.mailbox
          ? client.mailbox
          : { uidValidity: BigInt(0), uidNext: 1 };
      const uidValidity = BigInt(status.uidValidity ?? 0);
      const uidNext = Number(status.uidNext ?? 1);

      // If the mailbox was recreated server-side, our cursor is meaningless — restart.
      const validityChanged = mailbox.imapUidValidity !== null && mailbox.imapUidValidity !== uidValidity;
      const lastUid = validityChanged ? null : mailbox.imapLastUid;
      const startUid = lastUid ? lastUid + 1 : Math.max(1, uidNext - INITIAL_WINDOW);

      let highestUid = lastUid ?? 0;

      for await (const message of client.fetch(
        `${startUid}:*`,
        { uid: true, source: true, internalDate: true },
        { uid: true },
      )) {
        if (ingested + skipped >= FETCH_CAP) {
          break;
        }

        const uid = Number(message.uid);
        if (uid > highestUid) {
          highestUid = uid;
        }
        if (!message.source) {
          continue;
        }

        const parsed = await simpleParser(message.source as Buffer);
        const fromAddress = parsed.from?.value?.[0];
        const fromEmail = fromAddress?.address ? normalizeEmail(fromAddress.address) : "";

        // Skip our own outgoing copies and anything without a sender.
        if (!fromEmail || fromEmail === selfEmail) {
          skipped += 1;
          continue;
        }

        const references = Array.isArray(parsed.references)
          ? parsed.references
          : parsed.references
            ? [parsed.references]
            : [];

        const raw: RawInboundMessage = {
          mailboxId: mailbox.id,
          messageId: parsed.messageId ?? `imap-${mailbox.id}-${uid}`,
          inReplyTo: parsed.inReplyTo ?? null,
          references,
          fromEmail,
          fromName: fromAddress?.name ?? null,
          subject: parsed.subject ?? null,
          html: typeof parsed.html === "string" ? parsed.html : null,
          text: parsed.text ?? null,
          headers: {
            "auto-submitted": headerString(parsed.headers.get("auto-submitted")),
            precedence: headerString(parsed.headers.get("precedence")),
            "x-autoreply": parsed.headers.has("x-autoreply") ? "yes" : undefined,
            "x-autorespond": parsed.headers.has("x-autorespond") ? "yes" : undefined,
          },
          receivedAt: new Date(message.internalDate ?? parsed.date ?? new Date()),
        };

        await ingestInboundMessage(raw);
        ingested += 1;
      }

      await prisma.mailbox.update({
        where: { id: mailbox.id },
        data: {
          imapLastUid: highestUid,
          imapUidValidity: uidValidity,
          imapLastSyncedAt: new Date(),
          imapLastError: null,
          connectionStatus: "READY",
        },
      });
    } finally {
      lock.release();
    }

    await client.logout();
    return { mailboxId, ingested, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "IMAP sync failed.";
    await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: { connectionStatus: "ERROR", imapLastError: message },
    });
    if (client) {
      try {
        await client.logout();
      } catch {
        // ignore secondary logout failure
      }
    }
    return { mailboxId, ingested, skipped, error: message };
  }
}

/** Syncs every IMAP-configured mailbox, logging a CronJobRun. */
export async function syncAllMailboxes() {
  const run = await prisma.cronJobRun.create({ data: { jobName: "outreach-inbox" } });

  const mailboxes = await prisma.mailbox.findMany({
    where: {
      imapHost: { not: null },
      imapUsername: { not: null },
      imapPasswordEnc: { not: null },
    },
    select: { id: true },
  });

  const results = [];
  let totalIngested = 0;
  let failures = 0;

  for (const mailbox of mailboxes) {
    const result = await syncMailboxInbox(mailbox.id);
    results.push(result);
    totalIngested += result.ingested;
    if (result.error) {
      failures += 1;
    }
  }

  await prisma.cronJobRun.update({
    where: { id: run.id },
    data: {
      status: failures > 0 ? "FAILED" : "SUCCEEDED",
      finishedAt: new Date(),
      summary: { mailboxes: mailboxes.length, totalIngested, failures, results } as unknown as Prisma.InputJsonValue,
    },
  });

  return { mailboxes: mailboxes.length, totalIngested, failures, runId: run.id };
}
