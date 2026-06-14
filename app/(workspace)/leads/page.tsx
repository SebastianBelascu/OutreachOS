import Link from "next/link";
import { connection } from "next/server";
import { Inbox } from "lucide-react";

import { AddLeadDialog } from "@/components/internal/add-lead-dialog";
import { DataToolbar } from "@/components/internal/data-toolbar";
import { EmptyState } from "@/components/internal/empty-state";
import { LeadImporter } from "@/components/internal/lead-importer";
import { StatusBadge } from "@/components/internal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateMissingFirstLinesAction } from "@/app/(workspace)/actions";
import { isAiConfigured } from "@/lib/outreach/ai";
import { CAMPAIGN_OFFERS, LEAD_PRIORITIES, LEAD_STATUSES } from "@/lib/outreach/constants";
import { listLeads } from "@/lib/outreach/leads";
import { formatDateTime } from "@/lib/utils";

interface LeadsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    offer?: string;
    priority?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  await connection();
  const params = await searchParams;
  const leads = await listLeads({
    search: params.q,
    status: params.status,
    offer: params.offer,
    priority: params.priority,
  });

  return (
    <div className="rounded-lg border bg-card">
      <DataToolbar
        actions={
          <>
            {isAiConfigured() ? (
              <form action={generateMissingFirstLinesAction}>
                <Button type="submit" variant="outline" size="sm">
                  Generate personalization (AI)
                </Button>
              </form>
            ) : null}
            <LeadImporter />
            <AddLeadDialog />
          </>
        }
      >
        <form className="flex flex-1 flex-col gap-2 md:flex-row">
          <Input
            name="q"
            placeholder="Search company, email, name"
            defaultValue={params.q ?? ""}
            className="md:max-w-sm"
          />
          <Select name="status" defaultValue={params.status ?? "ALL"}>
            <SelectTrigger className="w-full md:w-[170px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="offer" defaultValue={params.offer ?? "ALL"}>
            <SelectTrigger className="w-full md:w-[190px]">
              <SelectValue placeholder="All offers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All offers</SelectItem>
              {CAMPAIGN_OFFERS.map((offer) => (
                <SelectItem key={offer} value={offer}>
                  {offer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="priority" defaultValue={params.priority ?? "ALL"}>
            <SelectTrigger className="w-full md:w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priority</SelectItem>
              {LEAD_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  Priority {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
        </form>
      </DataToolbar>

      {leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No leads found"
          description="Add one lead manually or import a CSV to start building the outbound database."
          action={<AddLeadDialog />}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Offer</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead>Suppression</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.company ?? (`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || lead.email)}
                    </Link>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {lead.bestOffer ? (
                      <span className="font-medium">{lead.bestOffer}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                    {lead.priority ? (
                      <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                        {lead.priority}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                    {lead.tags.map((entry) => entry.tag.name).join(", ") || "-"}
                  </TableCell>
                  <TableCell className="text-sm">{lead.enrollments.length}</TableCell>
                  <TableCell className="text-sm">
                    {lead.suppressions.length > 0 ? (
                      <StatusBadge status="SUPPRESSED" />
                    ) : (
                      <span className="text-muted-foreground">Clear</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDateTime(lead.updatedAt)}
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
