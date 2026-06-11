import Link from "next/link";
import { connection } from "next/server";
import { Mail } from "lucide-react";

import { CreateCampaignDialog } from "@/components/internal/create-campaign-dialog";
import { CreateCampaignFromTemplateDialog } from "@/components/internal/create-campaign-from-template-dialog";
import { DataToolbar } from "@/components/internal/data-toolbar";
import { EmptyState } from "@/components/internal/empty-state";
import { StatusBadge } from "@/components/internal/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCampaigns, listMailboxes } from "@/lib/outreach/campaigns";
import { formatDateTime } from "@/lib/utils";

export default async function CampaignsPage() {
  await connection();
  const [campaigns, mailboxes] = await Promise.all([listCampaigns(), listMailboxes()]);

  return (
    <div className="rounded-lg border bg-card">
      <DataToolbar
        actions={
          <div className="flex items-center gap-2">
            <CreateCampaignFromTemplateDialog mailboxes={mailboxes} />
            <CreateCampaignDialog mailboxes={mailboxes} />
          </div>
        }
      >
        <div>
          <p className="text-sm font-medium">Campaigns</p>
          <p className="text-xs text-muted-foreground">Build sequences, enroll leads, and launch safely.</p>
        </div>
      </DataToolbar>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No campaigns yet"
          description="Create a campaign after adding at least one active mailbox."
          action={<CreateCampaignDialog mailboxes={mailboxes} />}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mailbox pool</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Queued</TableHead>
                <TableHead className="text-right">Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Link href={`/campaigns/${campaign.id}`} className="font-medium hover:underline">
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{campaign.description ?? "No description"}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{campaign.mailboxPool.length || 1} inboxes</p>
                    <p className="text-xs text-muted-foreground">{campaign.mailbox.fromEmail}</p>
                  </TableCell>
                  <TableCell>{campaign.steps.length}</TableCell>
                  <TableCell>{campaign.enrollments.length}</TableCell>
                  <TableCell>{campaign.messages.length}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDateTime(campaign.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
