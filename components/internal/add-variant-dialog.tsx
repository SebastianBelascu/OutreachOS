"use client";

import { Plus } from "lucide-react";

import { createSequenceStepVariantAction } from "@/app/(workspace)/actions";
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
import { Textarea } from "@/components/ui/textarea";

interface AddVariantDialogProps {
  campaignId: string;
  sequenceStepId: string;
  suggestedLabel: string;
}

export function AddVariantDialog({ campaignId, sequenceStepId, suggestedLabel }: AddVariantDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Plus className="size-3" />
          Add variant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add A/B variant</DialogTitle>
          <DialogDescription>
            Each enrolled lead is assigned one variant (weighted). Supports {"{{variables}}"} and spintax {"{a|b}"}.
          </DialogDescription>
        </DialogHeader>
        <form action={createSequenceStepVariantAction} className="space-y-3">
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="sequenceStepId" value={sequenceStepId} />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`variantLabel-${sequenceStepId}`}>Label</Label>
              <Input
                id={`variantLabel-${sequenceStepId}`}
                name="label"
                defaultValue={suggestedLabel}
                maxLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`variantWeight-${sequenceStepId}`}>Weight</Label>
              <Input
                id={`variantWeight-${sequenceStepId}`}
                name="weight"
                type="number"
                defaultValue="1"
                min="1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`variantSubject-${sequenceStepId}`}>Subject</Label>
            <Input id={`variantSubject-${sequenceStepId}`} name="subject" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`variantBody-${sequenceStepId}`}>Body</Label>
            <Textarea
              id={`variantBody-${sequenceStepId}`}
              name="body"
              className="min-h-[180px] text-sm"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit">Add variant</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
