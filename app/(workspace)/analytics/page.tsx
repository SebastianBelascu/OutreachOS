import { connection } from "next/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsSnapshot } from "@/lib/outreach/analytics";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPercent } from "@/lib/utils";

export default async function AnalyticsPage() {
  await connection();
  const [snapshot, recentRuns, recentEvents] = await Promise.all([
    getAnalyticsSnapshot(),
    prisma.cronJobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
    prisma.emailEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-[24px] border-white/70 bg-white/85">
        <CardHeader>
          <CardTitle>Core metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sent</p>
            <p className="mt-2 text-3xl font-semibold">{snapshot.totals.sent}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Delivered</p>
            <p className="mt-2 text-3xl font-semibold">{snapshot.totals.delivered}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Open rate</p>
            <p className="mt-2 text-3xl font-semibold">{formatPercent(snapshot.rates.openRate)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Unsubscribed</p>
            <p className="mt-2 text-3xl font-semibold">{snapshot.totals.unsubscribed}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[24px] border-white/70 bg-white/85">
          <CardHeader>
            <CardTitle>Worker activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {recentRuns.map((run) => (
              <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{run.jobName}</p>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] text-white">
                    {run.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(run.startedAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-white/70 bg-white/85">
          <CardHeader>
            <CardTitle>Recent email events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {recentEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{event.eventType}</p>
                  <span className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{event.providerMessageId ?? "No provider message ID yet"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
