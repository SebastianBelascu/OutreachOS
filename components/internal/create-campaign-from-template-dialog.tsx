"use client";

import type { Mailbox } from "@prisma/client";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import { createCampaignFromTemplateAction } from "@/app/(workspace)/actions";
import { SendWindowPicker } from "@/components/internal/send-window-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_TEMPLATES } from "@/lib/outreach/templates";

interface CreateCampaignFromTemplateDialogProps {
  mailboxes: Omit<Mailbox, "imapPasswordEnc" | "smtpPasswordEnc">[];
}

export function CreateCampaignFromTemplateDialog({ mailboxes }: CreateCampaignFromTemplateDialogProps) {
  const [templateId, setTemplateId] = useState(CAMPAIGN_TEMPLATES[0]?.id ?? "");
  const selected = CAMPAIGN_TEMPLATES.find((template) => template.id === templateId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={mailboxes.length === 0}>
          <Sparkles className="size-4" />
          From template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create campaign from template</DialogTitle>
          <DialogDescription>
            Pre-fills a 3-step SmartFusion sequence (uses {"{{first_line}}"} / {"{{observation}}"} from lead-hub).
          </DialogDescription>
        </DialogHeader>
        <form action={createCampaignFromTemplateAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="templateId" value={templateId} />
          <div className="space-y-2 md:col-span-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.offer} — {template.language.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected ? (
              <p className="text-xs text-muted-foreground">{selected.description}</p>
            ) : null}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="templateCampaignName">Campaign name</Label>
            <Input
              id="templateCampaignName"
              name="name"
              defaultValue={selected?.name ?? ""}
              key={templateId}
              placeholder={selected?.name ?? "Campaign name"}
            />
          </div>
          <div className="space-y-2">
            <Label>Fallback mailbox</Label>
            <Select name="mailboxId" defaultValue={mailboxes[0]?.id}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select mailbox" />
              </SelectTrigger>
              <SelectContent>
                {mailboxes.map((mailbox) => (
                  <SelectItem key={mailbox.id} value={mailbox.id}>
                    {mailbox.name} - {mailbox.fromEmail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="templateDailyLimit">Daily limit</Label>
            <Input
              id="templateDailyLimit"
              name="dailyLimit"
              type="number"
              defaultValue={String(selected?.defaultDailyLimit ?? 30)}
              min="1"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Mailbox pool</Label>
            <div className="grid gap-2 rounded-md border p-2 md:grid-cols-2">
              {mailboxes.map((mailbox) => (
                <Label
                  key={mailbox.id}
                  className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                >
                  <Checkbox name="mailboxIds" value={mailbox.id} defaultChecked={mailbox.id === mailboxes[0]?.id} />
                  <span className="min-w-0 truncate">{mailbox.fromEmail}</span>
                </Label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="templateTimezone">Timezone</Label>
            <Input id="templateTimezone" name="timezone" defaultValue="Europe/Bucharest" />
          </div>
          <SendWindowPicker />
          <DialogFooter className="md:col-span-2">
            <Button type="submit">Create campaign</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
