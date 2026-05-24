import { connection } from "next/server";

import { createMailboxAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listMailboxes } from "@/lib/outreach/campaigns";

export default async function MailboxesPage() {
  await connection();
  const mailboxes = await listMailboxes();

  return (
    <div className="space-y-6">
      <Card className="rounded-[24px] border-white/70 bg-white/85">
        <CardHeader>
          <CardTitle>Add mailbox</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMailboxAction} className="grid gap-4 md:grid-cols-2">
            <Input name="name" placeholder="Mailbox label" />
            <Input name="fromEmail" type="email" placeholder="from@domain.com" />
            <Input name="fromName" placeholder="From name" />
            <Input name="replyTo" placeholder="reply@domain.com" />
            <Input name="dailyCap" type="number" defaultValue="30" placeholder="Daily cap" />
            <Input name="timezone" defaultValue="Europe/Bucharest" placeholder="Timezone" />
            <Input name="sendWindowDays" defaultValue="1,2,3,4,5" placeholder="Active days" />
            <Input name="sendWindowStartHour" type="number" defaultValue="9" placeholder="Start hour" />
            <Input name="sendWindowEndHour" type="number" defaultValue="17" placeholder="End hour" />
            <select name="warmupState" className="flex h-10 rounded-xl border border-input bg-transparent px-3 text-sm">
              <option value="COLD">COLD</option>
              <option value="WARMING">WARMING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
            </select>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm">
              <input type="checkbox" name="isActive" defaultChecked />
              Mailbox is active
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Save mailbox</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {mailboxes.map((mailbox) => (
          <Card key={mailbox.id} className="rounded-[24px] border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle>{mailbox.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-slate-600">{mailbox.fromEmail}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Daily cap</p>
                  <p className="mt-2 text-xl font-semibold">{mailbox.dailyCap}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Warmup</p>
                  <p className="mt-2 text-xl font-semibold">{mailbox.warmupState}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Linked campaigns</p>
                  <p className="mt-2 text-xl font-semibold">{mailbox.campaigns.length}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {mailbox.isActive ? "Active sender identity." : "Paused sender identity."} · {mailbox.messages.length} live messages.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
