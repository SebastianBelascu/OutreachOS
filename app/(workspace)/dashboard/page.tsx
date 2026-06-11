import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, MailCheck, ServerCog } from "lucide-react";

import { ActionNextStep } from "@/components/internal/action-next-step";
import { InboxCapacityChart, OutreachFunnelChart, SendingVolumeChart } from "@/components/internal/visual-charts";
import { MetricCard } from "@/components/internal/metric-card";
import { ReadinessScoreCard } from "@/components/internal/readiness-score-card";
import { SetupProgress } from "@/components/internal/setup-progress";
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
  getCommandCenterSnapshot,
  getDailySendingSeries,
  getDeliverabilityAlerts,
  getInboxCapacity,
  getOutreachFunnel,
  getReplyTotals,
  getWorkspaceStats,
} from "@/lib/outreach/analytics";
import { listCampaigns } from "@/lib/outreach/campaigns";
import { listLeads } from "@/lib/outreach/leads";
import { formatNumber, formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  await connection();
  const [stats, analytics, commandCenter, sendingSeries, funnel, inboxCapacity, alerts, replyTotals, campaigns, leads] =
    await Promise.all([
      getWorkspaceStats(),
      getAnalyticsSnapshot(),
      getCommandCenterSnapshot(),
      getDailySendingSeries(14),
      getOutreachFunnel(),
      getInboxCapacity(),
      getDeliverabilityAlerts(),
      getReplyTotals(),
      listCampaigns(),
      listLeads(),
    ]);

  return (
    <div className="space-y-4">
      <ActionNextStep nextAction={commandCenter.nextAction} />

      {alerts.length > 0 ? (
        <Card className="rounded-lg border-amber-200 bg-amber-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="size-4" />
              Deliverability alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <Link
                key={`${alert.kind}-${alert.label}`}
                href={alert.href}
                className="flex items-start gap-2 rounded-md bg-background/70 p-2 text-sm hover:bg-background"
              >
                <span
                  className={`mt-1 inline-block size-2 shrink-0 rounded-full ${
                    alert.severity === "critical" ? "bg-rose-500" : "bg-amber-500"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{alert.label}</span>
                  <span className="block text-xs text-muted-foreground">{alert.detail}</span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Leads" value={formatNumber(stats.leads)} hint="Canonical lead database." />
        <MetricCard label="Active campaigns" value={formatNumber(stats.activeCampaigns)} hint="Eligible to send." />
        <MetricCard label="Capacity left today" value={formatNumber(commandCenter.capacityToday.available)} hint={`${commandCenter.capacityToday.used}/${commandCenter.capacityToday.total} used.`} />
        <MetricCard label="Queued messages" value={formatNumber(stats.scheduledMessages)} hint="Cron will claim eligible work." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <ReadinessScoreCard score={commandCenter.readinessScore} />
          <SetupProgress steps={commandCenter.setupSteps} />
        </div>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Sending trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SendingVolumeChart data={sendingSeries} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Outreach funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <OutreachFunnelChart data={funnel} />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Inbox capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <InboxCapacityChart data={inboxCapacity} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardContent className="flex items-start gap-3 p-4">
            <ServerCog className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Infrastructure blockers</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {commandCenter.blockers.domains} domains, {commandCenter.blockers.mailboxes} inboxes blocked.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="flex items-start gap-3 p-4">
            <MailCheck className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Performance now</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Delivery {formatPercent(analytics.rates.deliveryRate)}, open {formatPercent(analytics.rates.openRate)}.
              </p>
            </div>
          </CardContent>
        </Card>
        <Link href="/inbox" className="block">
          <Card className="rounded-lg transition hover:border-primary/40">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Replies</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatPercent(replyTotals.replyRate)} reply rate · {replyTotals.unread} unread
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent campaigns</CardTitle>
            <Link href="/campaigns" className="text-sm text-muted-foreground hover:text-foreground">
              Manage
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Queue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.slice(0, 5).map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">{campaign.mailbox.fromEmail}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="text-right">{campaign.messages.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Fresh leads</CardTitle>
            <Link href="/leads" className="text-sm text-muted-foreground hover:text-foreground">
              Open
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.slice(0, 5).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <p className="font-medium">{lead.company ?? lead.email}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
