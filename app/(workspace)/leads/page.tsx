import { connection } from "next/server";
import { Inbox } from "lucide-react";

import { AddLeadDialog } from "@/components/internal/add-lead-dialog";
import { DataToolbar } from "@/components/internal/data-toolbar";
import { EmptyState } from "@/components/internal/empty-state";
import { LeadImporter } from "@/components/internal/lead-importer";
import { LeadsTable, type LeadRow } from "@/components/internal/leads-table";
import { FormSubmitButton, ToastForm } from "@/components/internal/toast-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const rows: LeadRow[] = leads.map((lead) => ({
    id: lead.id,
    label: lead.company ?? (`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || lead.email),
    email: lead.email,
    status: lead.status,
    bestOffer: lead.bestOffer,
    priority: lead.priority,
    tags: lead.tags.map((entry) => entry.tag.name).join(", "),
    enrollmentCount: lead.enrollments.length,
    suppressed: lead.suppressions.length > 0,
    updatedAt: formatDateTime(lead.updatedAt),
  }));

  return (
    <div className="rounded-lg border bg-card">
      <DataToolbar
        actions={
          <>
            {isAiConfigured() ? (
              <ToastForm action={generateMissingFirstLinesAction} success="Personalizare generată">
                <FormSubmitButton variant="outline" size="sm" pendingLabel="Se generează...">
                  Generate personalization (AI)
                </FormSubmitButton>
              </ToastForm>
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

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No leads found"
          description="Add one lead manually or import a CSV to start building the outbound database."
          action={<AddLeadDialog />}
        />
      ) : (
        <LeadsTable leads={rows} />
      )}
    </div>
  );
}
