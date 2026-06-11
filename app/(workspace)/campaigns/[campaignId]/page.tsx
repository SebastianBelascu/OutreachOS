import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AddSequenceStepDialog } from "@/components/internal/add-sequence-step-dialog";
import { CampaignPreflight } from "@/components/internal/campaign-preflight";
import { CampaignProgressRail } from "@/components/internal/campaign-progress-rail";
import { LeadPicker } from "@/components/internal/lead-picker";
import { SequenceStepCard } from "@/components/internal/sequence-step-card";
import { StatusBadge } from "@/components/internal/status-badge";
import { VariantPerformanceTable } from "@/components/internal/variant-performance-table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCampaignProgressSnapshot, getVariantPerformance } from "@/lib/outreach/analytics";
import { getCampaignById } from "@/lib/outreach/campaigns";
import { listLeads } from "@/lib/outreach/leads";
import { buildLeadTemplateParams } from "@/lib/outreach/variables";
import { formatDateTime } from "@/lib/utils";

interface CampaignDetailPageProps {
  params: Promise<{
    campaignId: string;
  }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  await connection();
  const { campaignId } = await params;
  const [campaign, leads, variantPerformance] = await Promise.all([
    getCampaignById(campaignId),
    listLeads(),
    getVariantPerformance(campaignId),
  ]);

  if (!campaign) {
    notFound();
  }
  const previewLeads = leads.slice(0, 12).map((lead) => ({
    id: lead.id,
    label: lead.company ?? lead.email,
    params: buildLeadTemplateParams(lead),
  }));
  const progress = getCampaignProgressSnapshot(campaign);
  const sentMessages = campaign.messages.filter((message) =>
    ["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(message.status),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{campaign.name}</h2>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.description ?? "No description"} - {campaign.mailboxPool.length || 1} inboxes in pool
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LeadPicker campaignId={campaign.id} leads={leads} />
          <AddSequenceStepDialog campaignId={campaign.id} previewLeads={previewLeads} />
        </div>
      </div>

      <CampaignProgressRail progress={progress} />

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Sequence</p>
            <p className="mt-2 text-2xl font-semibold">{campaign.steps.length}</p>
            <p className="text-xs text-muted-foreground">email steps</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Leads</p>
            <p className="mt-2 text-2xl font-semibold">{campaign.enrollments.length}</p>
            <p className="text-xs text-muted-foreground">enrolled</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Queued</p>
            <p className="mt-2 text-2xl font-semibold">{campaign.messages.length}</p>
            <p className="text-xs text-muted-foreground">scheduled or recent</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Sent</p>
            <p className="mt-2 text-2xl font-semibold">{sentMessages}</p>
            <p className="text-xs text-muted-foreground">already contacted</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sequence" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sequence">Sequence</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="launch">Launch</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="sequence" className="space-y-3">
          {campaign.steps.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <p className="text-sm font-medium">No sequence steps yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add the first outreach email before enrolling leads.</p>
              <div className="mt-4">
                <AddSequenceStepDialog campaignId={campaign.id} previewLeads={previewLeads} />
              </div>
            </div>
          ) : (
            <>
              {campaign.steps.map((step) => (
                <SequenceStepCard key={step.id} campaignId={campaign.id} step={step} />
              ))}
              <VariantPerformanceTable rows={variantPerformance} />
            </>
          )}
        </TabsContent>

        <TabsContent value="leads" className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <div>
              <p className="text-sm font-medium">Enrolled leads</p>
              <p className="text-xs text-muted-foreground">{campaign.enrollments.length} leads in this campaign</p>
            </div>
            <LeadPicker campaignId={campaign.id} leads={leads} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next step</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <p className="font-medium">{enrollment.lead.company ?? enrollment.lead.email}</p>
                    <p className="text-xs text-muted-foreground">{enrollment.lead.email}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={enrollment.status} />
                  </TableCell>
                  <TableCell>{enrollment.nextStepOrder}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDateTime(enrollment.enrolledAt)}
                  </TableCell>
                </TableRow>
              ))}
              {campaign.enrollments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                    No leads enrolled yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="launch">
          <CampaignPreflight campaign={campaign} />
        </TabsContent>

        <TabsContent value="messages" className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mailbox</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="font-medium">{message.subject}</TableCell>
                  <TableCell>{message.lead.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={message.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{message.mailbox.fromEmail}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{message.providerMessageId ?? "pending"}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDateTime(message.scheduledAt)}
                  </TableCell>
                </TableRow>
              ))}
              {campaign.messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    No messages scheduled yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="events" className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Provider message</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Occurred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <StatusBadge status={event.eventType} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{event.providerMessageId ?? "-"}</TableCell>
                  <TableCell>{event.leadEmail ?? "-"}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDateTime(event.occurredAt)}
                  </TableCell>
                </TableRow>
              ))}
              {campaign.events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                    No Brevo events received yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
