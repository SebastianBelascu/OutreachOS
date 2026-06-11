import { connection } from "next/server";

import { DomainHealthMap, InboxCapacityChart, OutreachFunnelChart, SendingVolumeChart } from "@/components/internal/visual-charts";
import { StatusBadge } from "@/components/internal/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAnalyticsSnapshot,
  getDailySendingSeries,
  getDomainReadiness,
  getInboxCapacity,
  getOutreachFunnel,
} from "@/lib/outreach/analytics";
import { listMailboxes } from "@/lib/outreach/campaigns";
import { getMailboxRampCap, listSendingDomains } from "@/lib/outreach/mailboxes";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPercent } from "@/lib/utils";

export default async function AnalyticsPage() {
  await connection();
  const [
    snapshot,
    sendingSeries,
    funnel,
    inboxCapacity,
    domainReadiness,
    recentRuns,
    recentEvents,
    mailboxes,
    domains,
  ] = await Promise.all([
    getAnalyticsSnapshot(),
    getDailySendingSeries(30),
    getOutreachFunnel(),
    getInboxCapacity(),
    getDomainReadiness(),
    prisma.cronJobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
    prisma.emailEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 10,
    }),
    listMailboxes(),
    listSendingDomains(),
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Sent", snapshot.totals.sent],
          ["Delivered", snapshot.totals.delivered],
          ["Open rate", formatPercent(snapshot.rates.openRate)],
          ["Unsubscribed", snapshot.totals.unsubscribed],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Sending volume</CardTitle>
          </CardHeader>
          <CardContent>
            <SendingVolumeChart data={sendingSeries} />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Campaign funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <OutreachFunnelChart data={funnel} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Inbox capacity chart</CardTitle>
          </CardHeader>
          <CardContent>
            <InboxCapacityChart data={inboxCapacity} />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Domain health map</CardTitle>
          </CardHeader>
          <CardContent>
            <DomainHealthMap data={domainReadiness} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Inbox capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inbox</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Cap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mailboxes.slice(0, 8).map((mailbox) => (
                  <TableRow key={mailbox.id}>
                    <TableCell>
                      <p className="font-medium">{mailbox.fromEmail}</p>
                      <p className="text-xs text-muted-foreground">{mailbox.domain?.domain ?? "legacy"}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={mailbox.healthStatus} />
                    </TableCell>
                    <TableCell className="text-right">{getMailboxRampCap(mailbox)} / {mailbox.dailyCap}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Domain readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Inboxes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.slice(0, 8).map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell>
                      <StatusBadge status={domain.status} />
                    </TableCell>
                    <TableCell className="text-right">{domain.mailboxes.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Worker activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.jobName}</TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDateTime(run.startedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Recent email events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Provider message</TableHead>
                  <TableHead className="text-right">Occurred</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <StatusBadge status={event.eventType} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{event.providerMessageId ?? "-"}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDateTime(event.occurredAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
