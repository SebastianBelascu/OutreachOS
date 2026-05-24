import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  activateCampaignAction,
  createSequenceStepAction,
  enrollLeadsAction,
} from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCampaignById } from "@/lib/outreach/campaigns";
import { listLeads } from "@/lib/outreach/leads";
import { formatDateTime } from "@/lib/utils";

interface CampaignDetailPageProps {
  params: Promise<{
    campaignId: string;
  }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  await connection();
  const { campaignId } = await params;
  const [campaign, leads] = await Promise.all([getCampaignById(campaignId), listLeads()]);

  if (!campaign) {
    notFound();
  }

  const availableLeadIds = leads.map((lead) => lead.id).join(",");

  return (
    <div className="space-y-6">
      <Card className="rounded-[24px] border-white/70 bg-white/85">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{campaign.name}</CardTitle>
            <p className="mt-2 text-sm text-slate-600">{campaign.description ?? "No description set."}</p>
          </div>
          <form action={activateCampaignAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <Button type="submit">Activate campaign</Button>
          </form>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mailbox</p>
            <p className="mt-2 font-medium">{campaign.mailbox.fromEmail}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
            <p className="mt-2 font-medium">{campaign.status}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Daily limit</p>
            <p className="mt-2 font-medium">{campaign.dailyLimit}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last activated</p>
            <p className="mt-2 font-medium">
              {campaign.lastActivatedAt ? formatDateTime(campaign.lastActivatedAt) : "Not yet"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card className="rounded-[24px] border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle>Add sequence step</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createSequenceStepAction} className="space-y-4">
                <input type="hidden" name="campaignId" value={campaign.id} />
                <Input name="subject" placeholder="Subject with {{first_name}} variables" />
                <Textarea name="body" placeholder="Email body with {{company}} and {{website}}" />
                <div className="grid gap-4 md:grid-cols-3">
                  <Input name="delayDaysMin" type="number" defaultValue="0" placeholder="Min delay" />
                  <Input name="delayDaysMax" type="number" defaultValue="0" placeholder="Max delay" />
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm">
                    <input type="checkbox" name="stopOnReply" defaultChecked />
                    Stop on reply
                  </label>
                </div>
                <Button type="submit">Add step</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle>Enroll leads</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={enrollLeadsAction} className="space-y-4">
                <input type="hidden" name="campaignId" value={campaign.id} />
                <Textarea
                  name="leadIds"
                  defaultValue={availableLeadIds}
                  className="min-h-[130px]"
                  placeholder="Comma-separated lead IDs"
                />
                <p className="text-xs text-slate-500">
                  Quick-start mode uses comma-separated lead IDs. You can paste a filtered batch here or trim the list before saving.
                </p>
                <Button type="submit" variant="outline">
                  Create enrollments
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[24px] border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle>Sequence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.steps.map((step) => (
                <div key={step.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Step {step.stepOrder}</p>
                  <p className="mt-2 font-medium text-slate-950">{step.subject}</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{step.body}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Delay {step.delayDaysMin}-{step.delayDaysMax} days · stop on reply: {step.stopOnReply ? "yes" : "no"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle>Scheduled messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.messages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{message.subject}</p>
                      <p className="text-xs text-slate-500">{message.lead.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] text-white">
                      {message.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Scheduled {formatDateTime(message.scheduledAt)} · provider id {message.providerMessageId ?? "pending"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
