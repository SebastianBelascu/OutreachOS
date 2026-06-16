import { connection } from "next/server";
import { Boxes, Gauge, ShieldAlert, ShieldCheck } from "lucide-react";

import { testMailboxConnectionAction, testSmtpConnectionAction } from "@/app/(workspace)/actions";
import { CreateMailboxDialog } from "@/components/internal/create-mailbox-dialog";
import { MailboxSettingsDialog } from "@/components/internal/mailbox-settings-dialog";
import { DataToolbar } from "@/components/internal/data-toolbar";
import { EmptyState } from "@/components/internal/empty-state";
import { StatusBadge } from "@/components/internal/status-badge";
import { InboxCapacityChart } from "@/components/internal/visual-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listMailboxes } from "@/lib/outreach/campaigns";
import { getInboxCapacity, getMailboxDeliverability } from "@/lib/outreach/analytics";
import { clampSendWindow } from "@/lib/outreach/format";
import { getMailboxRampCap, listSendingDomains } from "@/lib/outreach/mailboxes";
import type { SendWindow } from "@/lib/outreach/types";

export default async function MailboxesPage() {
  await connection();
  const [mailboxes, domains, inboxCapacity, deliverability] = await Promise.all([
    listMailboxes(),
    listSendingDomains(),
    getInboxCapacity(),
    getMailboxDeliverability(),
  ]);
  const readyMailboxes = mailboxes.filter(
    (mailbox) =>
      mailbox.isActive &&
      ["HEALTHY", "WARNING"].includes(mailbox.healthStatus) &&
      mailbox.warmupState !== "PAUSED" &&
      (!mailbox.domain || mailbox.domain.status === "READY"),
  );
  const blockedMailboxes = mailboxes.length - readyMailboxes.length;
  const totalCapacity = inboxCapacity.reduce((sum, inbox) => sum + inbox.cap, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <DataToolbar actions={<CreateMailboxDialog domains={domains} />}>
          <div>
            <p className="text-sm font-medium">Mailboxes</p>
            <p className="text-xs text-muted-foreground">Inbox identities, SMTP sending, ramp caps, and rotation health.</p>
          </div>
        </DataToolbar>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 size-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Ready inboxes</p>
              <p className="mt-1 text-2xl font-semibold">{readyMailboxes.length}</p>
              <p className="text-xs text-muted-foreground">Pot trimite in rotation azi.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldAlert className="mt-0.5 size-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium">Blocked inboxes</p>
              <p className="mt-1 text-2xl font-semibold">{blockedMailboxes}</p>
              <p className="text-xs text-muted-foreground">Unverified, paused sau domain not ready.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="flex items-start gap-3 p-4">
            <Gauge className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Safe cap today</p>
              <p className="mt-1 text-2xl font-semibold">{totalCapacity}</p>
              <p className="text-xs text-muted-foreground">Ramp cap total, nu fortam inboxurile.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardContent className="p-4">
          <InboxCapacityChart data={inboxCapacity} />
        </CardContent>
      </Card>

      {mailboxes.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={Boxes}
            title="No mailboxes configured"
            description="Add real inboxes from your outreach domains before creating campaigns."
            action={<CreateMailboxDialog domains={domains} />}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mailbox</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Deliverability (7d)</TableHead>
                <TableHead>Warmup</TableHead>
                <TableHead>Effective cap</TableHead>
                <TableHead>Rotation</TableHead>
                <TableHead>Inbox (IMAP)</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead>Live messages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mailboxes.map((mailbox) => (
                <TableRow key={mailbox.id}>
                  <TableCell>
                    <p className="font-medium">{mailbox.name}</p>
                    <p className="text-xs text-muted-foreground">{mailbox.fromEmail}</p>
                    <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {mailbox.sendTransport === "SMTP" ? "SMTP direct" : "Brevo API"}
                    </span>
                    <div>
                      <MailboxSettingsDialog
                        mailboxId={mailbox.id}
                        mailboxName={mailbox.name}
                        timezone={mailbox.timezone}
                        sendWindow={clampSendWindow(mailbox.sendWindow as unknown as Partial<SendWindow>)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{mailbox.domain?.domain ?? "Legacy sender"}</p>
                    <p className="text-xs text-muted-foreground">{mailbox.hostLabel ?? mailbox.domain?.hostLabel ?? "-"}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={mailbox.isActive ? mailbox.healthStatus : "PAUSED"} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {(deliverability[mailbox.id]?.sent ?? 0) +
                      (deliverability[mailbox.id]?.bounced ?? 0) +
                      (deliverability[mailbox.id]?.replies ?? 0) ===
                    0 ? (
                      <span className="text-muted-foreground">No data yet</span>
                    ) : (
                      <div className="space-y-0.5">
                        <p>
                          {deliverability[mailbox.id]?.sent ?? 0} sent · {deliverability[mailbox.id]?.replies ?? 0} repl
                        </p>
                        <p
                          className={
                            (deliverability[mailbox.id]?.bounced ?? 0) > 0
                              ? "font-medium text-rose-600"
                              : "text-muted-foreground"
                          }
                        >
                          {deliverability[mailbox.id]?.bounced ?? 0} bounced
                          {(deliverability[mailbox.id]?.bounceRate ?? 0) > 0
                            ? ` (${(deliverability[mailbox.id]?.bounceRate ?? 0).toFixed(1)}%)`
                            : ""}
                        </p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={mailbox.warmupState} />
                  </TableCell>
                  <TableCell>
                    <p>{getMailboxRampCap(mailbox)} / {mailbox.dailyCap}</p>
                    <p className="text-xs text-muted-foreground">max {mailbox.maxDailyCap}</p>
                  </TableCell>
                  <TableCell>{mailbox.rotationWeight}x</TableCell>
                  <TableCell>
                    {mailbox.imapHost || mailbox.smtpHost ? (
                      <div className="space-y-1">
                        <StatusBadge status={mailbox.connectionStatus} />
                        <div className="flex gap-1">
                          {mailbox.imapHost ? (
                            <form action={testMailboxConnectionAction}>
                              <input type="hidden" name="mailboxId" value={mailbox.id} />
                              <Button type="submit" variant="outline" size="sm" className="h-6 px-2 text-xs">
                                Test IMAP
                              </Button>
                            </form>
                          ) : null}
                          {mailbox.smtpHost ? (
                            <form action={testSmtpConnectionAction}>
                              <input type="hidden" name="mailboxId" value={mailbox.id} />
                              <Button type="submit" variant="outline" size="sm" className="h-6 px-2 text-xs">
                                Test SMTP
                              </Button>
                            </form>
                          ) : null}
                        </div>
                        {mailbox.imapLastError ? (
                          <p className="max-w-[180px] truncate text-[10px] text-rose-600" title={mailbox.imapLastError}>
                            {mailbox.imapLastError}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>{mailbox.campaignPoolAssignments.length || mailbox.campaigns.length}</TableCell>
                  <TableCell>{mailbox.messages.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
