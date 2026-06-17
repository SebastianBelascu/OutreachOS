"use client";

import { Pencil } from "lucide-react";

import { updateSequenceStepAction } from "@/app/(workspace)/actions";
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
import { Textarea } from "@/components/ui/textarea";

interface EditSequenceStepDialogProps {
  campaignId: string;
  step: {
    id: string;
    stepOrder: number;
    subject: string;
    body: string;
    delayDaysMin: number;
    delayDaysMax: number;
    stopOnReply: boolean;
  };
}

export function EditSequenceStepDialog({ campaignId, step }: EditSequenceStepDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2 text-xs">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit step {step.stepOrder}</DialogTitle>
          <DialogDescription>
            Update subject, body, delay and stop-on-reply. Changes apply to messages scheduled after this — already
            queued ones keep their content.
          </DialogDescription>
        </DialogHeader>
        <form action={updateSequenceStepAction} className="space-y-4">
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="stepId" value={step.id} />
          <div className="space-y-2">
            <Label htmlFor={`subject-${step.id}`}>Subject</Label>
            <Input id={`subject-${step.id}`} name="subject" defaultValue={step.subject} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`body-${step.id}`}>Body</Label>
            <Textarea
              id={`body-${step.id}`}
              name="body"
              defaultValue={step.body}
              className="min-h-[240px]"
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`min-${step.id}`}>Min delay (days)</Label>
              <Input
                id={`min-${step.id}`}
                name="delayDaysMin"
                type="number"
                min="0"
                defaultValue={String(step.delayDaysMin)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`max-${step.id}`}>Max delay (days)</Label>
              <Input
                id={`max-${step.id}`}
                name="delayDaysMax"
                type="number"
                min="0"
                defaultValue={String(step.delayDaysMax)}
              />
            </div>
            <Label className="flex h-9 items-center gap-2 self-end rounded-md border px-3 text-sm">
              <Checkbox name="stopOnReply" defaultChecked={step.stopOnReply} />
              Stop on reply
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
