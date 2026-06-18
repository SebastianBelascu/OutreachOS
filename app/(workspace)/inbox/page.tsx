import Link from "next/link";
import { connection } from "next/server";
import { Inbox as InboxIcon } from "lucide-react";

import { InboxActions } from "@/components/internal/inbox-actions";
import { ReplyComposer } from "@/components/internal/reply-composer";
import { StatusBadge } from "@/components/internal/status-badge";
import { TestEmailDialog } from "@/components/internal/test-email-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireAppUser } from "@/lib/outreach/auth";
import { INBOUND_CLASSIFICATIONS } from "@/lib/outreach/constants";
import { getThread, listInbox } from "@/lib/outreach/inbox";
import { prisma } from "@/lib/prisma";
import { cn, formatDateTime } from "@/lib/utils";
import type { InboundClassification } from "@prisma/client";

interface InboxPageProps {
  searchParams: Promise<{
    mailboxId?: string;
    campaignId?: string;
    classification?: string;
    unread?: string;
    q?: string;
    thread?: string;
  }>;
}

const CLASSIFICATION_VALUES = new Set<string>(INBOUND_CLASSIFICATIONS);

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...params, ...overrides };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value && value !== "ALL") {
      query.set(key, value);
    }
  }
  const qs = query.toString();
  return qs ? `/inbox?${qs}` : "/inbox";
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  await connection();
  const params = await searchParams;
  const classification =
    params.classification && CLASSIFICATION_VALUES.has(params.classification)
      ? (params.classification as InboundClassification)
      : undefined;

  const [items, mailboxes, campaigns, thread, appUser] = await Promise.all([
    listInbox({
      mailboxId: params.mailboxId,
      campaignId: params.campaignId,
      classification,
      unreadOnly: params.unread === "1",
      search: params.q,
    }),
    prisma.mailbox.findMany({ select: { id: true, fromEmail: true }, orderBy: { fromEmail: "asc" } }),
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
    params.thread ? getThread(params.thread) : Promise.resolve(null),
    requireAppUser(),
  ]);

  const baseParams = {
    mailboxId: params.mailboxId,
    campaignId: params.campaignId,
    classification: params.classification,
    unread: params.unread,
    q: params.q,
    thread: params.thread,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Răspunsurile sunt aduse automat de cron la fiecare 10 minute.
        </p>
        <TestEmailDialog mailboxes={mailboxes} defaultTo={appUser?.email} />
      </div>
      <div className="rounded-lg border bg-card p-3">
        <form className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          <Input name="q" placeholder="Search sender, subject" defaultValue={params.q ?? ""} className="md:max-w-xs" />
          <Select name="mailboxId" defaultValue={params.mailboxId ?? "ALL"}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="All mailboxes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All mailboxes</SelectItem>
              {mailboxes.map((mailbox) => (
                <SelectItem key={mailbox.id} value={mailbox.id}>
                  {mailbox.fromEmail}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="campaignId" defaultValue={params.campaignId ?? "ALL"}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="classification" defaultValue={params.classification ?? "ALL"}>
            <SelectTrigger className="w-full md:w-[170px]">
              <SelectValue placeholder="All replies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All replies</SelectItem>
              {INBOUND_CLASSIFICATIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.replaceAll("_", " ").toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="unread" value="1" defaultChecked={params.unread === "1"} />
            Unread only
          </label>
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-4 py-2 text-sm font-medium">Replies ({items.length})</div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <InboxIcon className="size-6" />
              No replies yet. The inbox cron pulls new mail every 10 minutes.
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y overflow-y-auto">
              {items.map((item) => {
                const active = item.id === params.thread;
                return (
                  <li key={item.id}>
                    <Link
                      href={buildHref(baseParams, { thread: item.id })}
                      className={cn(
                        "block px-4 py-3 hover:bg-muted/40",
                        active && "bg-muted/60",
                        !item.isRead && "border-l-2 border-l-primary",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", !item.isRead && "font-semibold")}>
                          {item.lead?.company ?? item.fromEmail}
                        </span>
                        <StatusBadge status={item.classification} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{item.subject ?? "(no subject)"}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.snippet}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{item.mailbox.fromEmail}</span>
                        <span>{formatDateTime(item.receivedAt)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          {!thread ? (
            <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted-foreground">
              Select a reply to view the conversation.
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {thread.inbound.lead?.company ?? thread.inbound.fromEmail}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {thread.inbound.campaign?.name ?? "No matched campaign"} · {thread.inbound.mailbox.fromEmail}
                    </p>
                  </div>
                  {thread.inbound.lead ? (
                    <Link
                      href={`/leads/${thread.inbound.lead.id}`}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Open lead
                    </Link>
                  ) : null}
                </div>
              </div>

              <InboxActions
                inboundMessageId={thread.inbound.id}
                isRead={thread.inbound.isRead}
                leadId={thread.inbound.leadId}
                campaignId={thread.inbound.campaignId}
                classification={thread.inbound.classification}
              />

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {thread.items.map((entry) => (
                  <div
                    key={`${entry.kind}-${entry.id}`}
                    className={cn("flex", entry.kind === "outbound" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg border p-3 text-sm",
                        entry.kind === "outbound" ? "bg-primary/5" : "bg-muted/40",
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{entry.fromLabel}</span>
                        <span>·</span>
                        <span>{formatDateTime(entry.at)}</span>
                        {entry.classification ? <StatusBadge status={entry.classification} /> : null}
                      </div>
                      {entry.subject ? <p className="text-xs font-medium">{entry.subject}</p> : null}
                      <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{entry.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <ReplyComposer inboundMessageId={thread.inbound.id} toEmail={thread.inbound.fromEmail} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
