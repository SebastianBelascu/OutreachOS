import Link from "next/link";
import { connection } from "next/server";

import { MetricCard } from "@/components/internal/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsSnapshot, getWorkspaceStats } from "@/lib/outreach/analytics";
import { listCampaigns } from "@/lib/outreach/campaigns";
import { listLeads } from "@/lib/outreach/leads";
import { formatNumber, formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  await connection();
  const [stats, analytics, campaigns, leads] = await Promise.all([
    getWorkspaceStats(),
    getAnalyticsSnapshot(),
    listCampaigns(),
    listLeads(),
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Leads" value={formatNumber(stats.leads)} hint="Canonical lead database in Postgres." />
        <MetricCard label="Active campaigns" value={formatNumber(stats.activeCampaigns)} hint="Campaigns currently eligible to send." />
        <MetricCard label="Active mailboxes" value={formatNumber(stats.activeMailboxes)} hint="Verified sender identities available now." />
        <MetricCard label="Queued messages" value={formatNumber(stats.scheduledMessages)} hint="Scheduled and claimed messages waiting to go out." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[24px] border-white/70 bg-white/85">
          <CardHeader>
            <CardTitle>Performance snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Delivery rate</p>
              <p className="mt-2 text-3xl font-semibold">{formatPercent(analytics.rates.deliveryRate)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Open rate</p>
              <p className="mt-2 text-3xl font-semibold">{formatPercent(analytics.rates.openRate)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Click rate</p>
              <p className="mt-2 text-3xl font-semibold">{formatPercent(analytics.rates.clickRate)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bounce rate</p>
              <p className="mt-2 text-3xl font-semibold">{formatPercent(analytics.rates.bounceRate)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-white/70 bg-slate-950 text-white">
          <CardHeader>
            <CardTitle>Operating notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            <p>Reply automation is prepared at the message-model level, but not enabled in this milestone.</p>
            <p>Every outbound message carries an unsubscribe token controlled by OutreachOS.</p>
            <p>Brevo drives delivery events while internal state changes stay in Postgres for auditability.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[24px] border-white/70 bg-white/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent campaigns</CardTitle>
            <Link href="/campaigns" className="text-sm text-slate-600 hover:text-slate-950">
              Manage campaigns
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.slice(0, 5).map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{campaign.name}</p>
                    <p className="text-sm text-slate-600">{campaign.mailbox.fromEmail}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-white">
                    {campaign.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {campaign.steps.length} steps · {campaign.enrollments.length} enrollments ·{" "}
                  {campaign.messages.length} messages waiting
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-white/70 bg-white/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Fresh leads</CardTitle>
            <Link href="/leads" className="text-sm text-slate-600 hover:text-slate-950">
              Open leads
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{lead.company ?? lead.email}</p>
                    <p className="text-sm text-slate-600">{lead.email}</p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-900">
                    {lead.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {lead.tags.map((tagAssignment) => tagAssignment.tag.name).join(", ") || "No tags yet"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
