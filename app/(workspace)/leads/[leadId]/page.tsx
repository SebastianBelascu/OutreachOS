import { notFound } from "next/navigation";
import { connection } from "next/server";

import { createLeadNoteAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getLeadById } from "@/lib/outreach/leads";
import { formatDateTime } from "@/lib/utils";

interface LeadDetailPageProps {
  params: Promise<{
    leadId: string;
  }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  await connection();
  const { leadId } = await params;
  const lead = await getLeadById(leadId);

  if (!lead) {
    notFound();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{lead.company ?? lead.email}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</p>
              <p className="mt-2">{lead.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
              <p className="mt-2">{lead.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Website</p>
              <p className="mt-2">{lead.website ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Country</p>
              <p className="mt-2">{lead.country ?? "-"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tags</p>
            <p className="mt-2 text-slate-600">
              {lead.tags.map((entry) => entry.tag.name).join(", ") || "No tags"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active suppressions</p>
            <p className="mt-2 text-slate-600">
              {lead.suppressions.map((entry) => entry.reason).join(", ") || "None"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Add note</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLeadNoteAction} className="space-y-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <Textarea name="content" placeholder="Context, objections, fit notes..." />
              <Button type="submit">Save note</Button>
            </form>
          </CardContent>
        </Card>

        {lead.inboundMessages.length > 0 ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Replies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.inboundMessages.map((reply) => (
                <div key={reply.id} className="rounded-md border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{reply.subject ?? "(no subject)"}</p>
                    <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {reply.classification.replaceAll("_", " ").toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                    {reply.cleanedText ?? reply.snippet ?? ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(reply.receivedAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.notes.map((note) => (
              <div key={note.id} className="rounded-md border bg-muted/30 p-4">
                <p className="text-sm text-slate-800">{note.content}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {note.author.fullName ?? note.author.email} · {formatDateTime(note.createdAt)}
                </p>
              </div>
            ))}
            {lead.messages.map((message) => (
              <div key={message.id} className="rounded-md border bg-muted/30 p-4">
                <p className="font-medium text-slate-900">{message.subject}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {message.status} · scheduled {formatDateTime(message.scheduledAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
