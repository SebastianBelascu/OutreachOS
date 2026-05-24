import Link from "next/link";
import { connection } from "next/server";

import { createCampaignAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCampaigns, listMailboxes } from "@/lib/outreach/campaigns";
import { formatDateTime } from "@/lib/utils";

export default async function CampaignsPage() {
  await connection();
  const [campaigns, mailboxes] = await Promise.all([listCampaigns(), listMailboxes()]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[24px] border-white/70 bg-white/85">
        <CardHeader>
          <CardTitle>Create campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCampaignAction} className="grid gap-4 md:grid-cols-2">
            <Input name="name" placeholder="Campaign name" />
            <Input name="description" placeholder="Short positioning note" />
            <select name="mailboxId" className="flex h-10 rounded-xl border border-input bg-transparent px-3 text-sm">
              {mailboxes.map((mailbox) => (
                <option key={mailbox.id} value={mailbox.id}>
                  {mailbox.name} · {mailbox.fromEmail}
                </option>
              ))}
            </select>
            <Input name="timezone" defaultValue="Europe/Bucharest" placeholder="Timezone" />
            <Input name="dailyLimit" type="number" defaultValue="30" placeholder="Daily limit" />
            <Input name="sendWindowDays" defaultValue="1,2,3,4,5" placeholder="Send days" />
            <Input name="sendWindowStartHour" type="number" defaultValue="9" placeholder="Start hour" />
            <Input name="sendWindowEndHour" type="number" defaultValue="17" placeholder="End hour" />
            <div className="md:col-span-2">
              <Button type="submit">Create campaign</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="rounded-[24px] border-white/70 bg-white/85">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{campaign.name}</CardTitle>
                <p className="mt-2 text-sm text-slate-600">{campaign.description ?? "No description yet."}</p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-white">{campaign.status}</span>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-slate-600">{campaign.mailbox.fromEmail}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Steps</p>
                  <p className="mt-2 text-xl font-semibold">{campaign.steps.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Enrollments</p>
                  <p className="mt-2 text-xl font-semibold">{campaign.enrollments.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Queued</p>
                  <p className="mt-2 text-xl font-semibold">{campaign.messages.length}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Updated {formatDateTime(campaign.updatedAt)}</span>
                <Link href={`/campaigns/${campaign.id}`} className="font-medium text-slate-900 hover:underline">
                  Open workflow
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
