"use client";

import { Clock } from "lucide-react";

import { updateMailboxSettingsAction } from "@/app/(workspace)/actions";
import { SendWindowPicker } from "@/components/internal/send-window-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { timezoneOptionsWith } from "@/lib/outreach/timezones";

interface MailboxSettingsDialogProps {
  mailboxId: string;
  mailboxName: string;
  timezone: string;
  sendWindow: { days: number[]; startHour: number; endHour: number };
}

export function MailboxSettingsDialog({
  mailboxId,
  mailboxName,
  timezone,
  sendWindow,
}: MailboxSettingsDialogProps) {
  const timezones = timezoneOptionsWith(timezone);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="mt-1 h-6 px-2 text-xs">
          <Clock className="size-3.5" />
          Timezone
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mailbox sending hours</DialogTitle>
          <DialogDescription>
            {mailboxName} — the scheduler checks both the campaign window and this mailbox window before
            sending, so set the timezone to match your recipients.
          </DialogDescription>
        </DialogHeader>
        <form action={updateMailboxSettingsAction} className="space-y-4">
          <input type="hidden" name="mailboxId" value={mailboxId} />
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select name="timezone" defaultValue={timezone}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SendWindowPicker
            defaultDays={sendWindow.days.map(String)}
            defaultStartHour={String(sendWindow.startHour)}
            defaultEndHour={String(sendWindow.endHour)}
          />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
