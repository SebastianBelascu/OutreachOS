"use client";

import { useState } from "react";
import { Settings } from "lucide-react";

import { updateCampaignSettingsAction } from "@/app/(workspace)/actions";
import { SendWindowPicker } from "@/components/internal/send-window-picker";
import { ToastForm, FormSubmitButton } from "@/components/internal/toast-form";
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

interface CampaignSettingsDialogProps {
  campaignId: string;
  timezone: string;
  dailyLimit: number;
  sendWindow: { days: number[]; startHour: number; endHour: number };
}

export function CampaignSettingsDialog({
  campaignId,
  timezone,
  dailyLimit,
  sendWindow,
}: CampaignSettingsDialogProps) {
  const timezones = timezoneOptionsWith(timezone);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings className="size-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Campaign settings</DialogTitle>
          <DialogDescription>
            Timezone and send window decide when the scheduler is allowed to send. Queued messages flush
            during the next allowed window.
          </DialogDescription>
        </DialogHeader>
        <ToastForm
          action={updateCampaignSettingsAction}
          success="Setări salvate"
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="campaignId" value={campaignId} />
          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily limit</Label>
              <Input
                id="dailyLimit"
                name="dailyLimit"
                type="number"
                min="1"
                defaultValue={String(dailyLimit)}
              />
            </div>
          </div>
          <SendWindowPicker
            defaultDays={sendWindow.days.map(String)}
            defaultStartHour={String(sendWindow.startHour)}
            defaultEndHour={String(sendWindow.endHour)}
          />
          <DialogFooter>
            <FormSubmitButton pendingLabel="Se salvează...">Save settings</FormSubmitButton>
          </DialogFooter>
        </ToastForm>
      </DialogContent>
    </Dialog>
  );
}
