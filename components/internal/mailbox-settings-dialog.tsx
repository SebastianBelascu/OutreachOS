"use client";

import { Pencil } from "lucide-react";

import { updateMailboxSettingsAction } from "@/app/(workspace)/actions";
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
import { timezoneOptionsWith } from "@/lib/outreach/timezones";

interface MailboxSettingsDialogProps {
  mailboxId: string;
  mailboxName: string;
  timezone: string;
  sendWindow: { days: number[]; startHour: number; endHour: number };
  isActive: boolean;
  healthStatus: string;
  warmupState: string;
  dailyCap: number;
  maxDailyCap: number;
  hourlyCap: number;
  rampStart: number;
  rampIncrement: number;
  rotationWeight: number;
}

export function MailboxSettingsDialog({
  mailboxId,
  mailboxName,
  timezone,
  sendWindow,
  isActive,
  healthStatus,
  warmupState,
  dailyCap,
  maxDailyCap,
  hourlyCap,
  rampStart,
  rampIncrement,
  rotationWeight,
}: MailboxSettingsDialogProps) {
  const timezones = timezoneOptionsWith(timezone);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="mt-1 h-6 px-2 text-xs">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit mailbox</DialogTitle>
          <DialogDescription>
            {mailboxName} — status, sending limits, timezone and send window. The scheduler checks both the
            campaign window and this mailbox window before sending.
          </DialogDescription>
        </DialogHeader>
        <form action={updateMailboxSettingsAction} className="space-y-4">
          <input type="hidden" name="mailboxId" value={mailboxId} />

          <Label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
            <Checkbox name="isActive" defaultChecked={isActive} />
            Active sender (uncheck to pause this inbox)
          </Label>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Health</Label>
              <Select name="healthStatus" defaultValue={healthStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                  <SelectItem value="HEALTHY">Healthy</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="UNHEALTHY">Unhealthy</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warmup</Label>
              <Select name="warmupState" defaultValue={warmupState}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COLD">Cold</SelectItem>
                  <SelectItem value="WARMING">Warming</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyCap">Daily cap</Label>
              <Input id="dailyCap" name="dailyCap" type="number" min="1" defaultValue={String(dailyCap)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDailyCap">Max daily cap</Label>
              <Input id="maxDailyCap" name="maxDailyCap" type="number" min="1" defaultValue={String(maxDailyCap)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyCap">Hourly cap</Label>
              <Input id="hourlyCap" name="hourlyCap" type="number" min="1" defaultValue={String(hourlyCap)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rotationWeight">Rotation weight</Label>
              <Input
                id="rotationWeight"
                name="rotationWeight"
                type="number"
                min="1"
                defaultValue={String(rotationWeight)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rampStart">Ramp start/day</Label>
              <Input id="rampStart" name="rampStart" type="number" min="1" defaultValue={String(rampStart)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rampIncrement">Ramp grow/day</Label>
              <Input
                id="rampIncrement"
                name="rampIncrement"
                type="number"
                min="0"
                defaultValue={String(rampIncrement)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
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
