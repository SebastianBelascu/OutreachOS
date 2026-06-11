import type { Mailbox } from "@prisma/client";
import { Plus } from "lucide-react";

import { createCampaignAction } from "@/app/(workspace)/actions";
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

interface CreateCampaignDialogProps {
  mailboxes: Omit<Mailbox, "imapPasswordEnc" | "smtpPasswordEnc">[];
}

export function CreateCampaignDialog({ mailboxes }: CreateCampaignDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" disabled={mailboxes.length === 0}>
          <Plus className="size-4" />
          New campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create campaign</DialogTitle>
          <DialogDescription>Set the sender, daily pace, and default sending window.</DialogDescription>
        </DialogHeader>
        <form action={createCampaignAction} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="campaignName">Name</Label>
            <Input id="campaignName" name="name" required />
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="campaignDescription">Description</Label>
            <Input id="campaignDescription" name="description" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Mailbox pool</Label>
            <div className="grid gap-2 rounded-md border p-2 md:grid-cols-2">
              {mailboxes.map((mailbox) => (
                <Label key={mailbox.id} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <Checkbox name="mailboxIds" value={mailbox.id} defaultChecked={mailbox.id === mailboxes[0]?.id} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{mailbox.fromEmail}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {mailbox.isActive ? mailbox.warmupState : "PAUSED"} pool sender
                    </span>
                  </span>
                </Label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" name="timezone" defaultValue="Europe/Bucharest" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Daily limit</Label>
            <Input id="dailyLimit" name="dailyLimit" type="number" defaultValue="30" min="1" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox name="rampEnabled" value="true" />
              Ramp the daily limit gradually after launch (recommended for new domains)
            </Label>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="rampStart" className="text-xs text-muted-foreground">
                  Start at (emails/day)
                </Label>
                <Input id="rampStart" name="rampStart" type="number" defaultValue="10" min="1" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rampIncrement" className="text-xs text-muted-foreground">
                  Increase per day
                </Label>
                <Input id="rampIncrement" name="rampIncrement" type="number" defaultValue="5" min="0" />
              </div>
            </div>
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
