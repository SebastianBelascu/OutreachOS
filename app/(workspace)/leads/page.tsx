import Link from "next/link";
import { connection } from "next/server";

import { LeadImporter } from "@/components/internal/lead-importer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createLeadAction } from "@/app/(workspace)/actions";
import { LEAD_STATUSES } from "@/lib/outreach/constants";
import { listLeads } from "@/lib/outreach/leads";
import { formatDateTime } from "@/lib/utils";

interface LeadsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  await connection();
  const params = await searchParams;
  const leads = await listLeads({
    search: params.q,
    status: params.status,
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[24px] border-white/70 bg-white/85">
          <CardHeader>
            <CardTitle>Create lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLeadAction} className="grid gap-4 md:grid-cols-2">
              <Input name="firstName" placeholder="First name" />
              <Input name="lastName" placeholder="Last name" />
              <Input name="email" placeholder="Email" type="email" className="md:col-span-2" />
              <Input name="company" placeholder="Company" />
              <Input name="website" placeholder="Website" />
              <Input name="industry" placeholder="Industry" />
              <Input name="country" placeholder="Country" />
              <Input name="linkedinUrl" placeholder="LinkedIn URL" className="md:col-span-2" />
              <Input name="tags" placeholder="Tags: cold, saas" className="md:col-span-2" />
              <div className="md:col-span-2">
                <select
                  name="status"
                  className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
                  defaultValue="NEW"
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Save lead</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <LeadImporter />
      </section>

      <Card className="rounded-[24px] border-white/70 bg-white/85">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Lead database</CardTitle>
            <p className="mt-2 text-sm text-slate-600">Search, qualify, and route leads into campaigns.</p>
          </div>
          <form className="flex flex-col gap-3 md:flex-row">
            <Input name="q" placeholder="Search company, email, name" defaultValue={params.q ?? ""} />
            <select
              name="status"
              className="flex h-10 rounded-xl border border-input bg-transparent px-3 text-sm"
              defaultValue={params.status ?? "ALL"}
            >
              <option value="ALL">All statuses</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Lead</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Tags</th>
                <th className="pb-3">Campaigns</th>
                <th className="pb-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-200 align-top">
                  <td className="py-4">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-slate-950 hover:underline">
                      {lead.company ?? (`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || lead.email)}
                    </Link>
                    <p className="text-xs text-slate-500">{lead.email}</p>
                  </td>
                  <td className="py-4">{lead.status}</td>
                  <td className="py-4 text-xs text-slate-600">
                    {lead.tags.map((entry) => entry.tag.name).join(", ") || "-"}
                  </td>
                  <td className="py-4 text-xs text-slate-600">
                    {lead.enrollments.map((entry) => entry.campaign.name).join(", ") || "-"}
                  </td>
                  <td className="py-4 text-xs text-slate-600">{formatDateTime(lead.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
