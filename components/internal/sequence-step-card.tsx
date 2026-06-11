import type { SequenceStep, SequenceStepVariant } from "@prisma/client";
import { Clock3, Mail } from "lucide-react";

import { deleteSequenceStepVariantAction, toggleSequenceStepVariantAction } from "@/app/(workspace)/actions";
import { AddVariantDialog } from "@/components/internal/add-variant-dialog";
import { Button } from "@/components/ui/button";

interface SequenceStepCardProps {
  campaignId: string;
  step: SequenceStep & { variants?: SequenceStepVariant[] };
}

function nextLabel(variants: SequenceStepVariant[]) {
  const used = new Set(variants.map((variant) => variant.label.toUpperCase()));
  for (const letter of ["A", "B", "C", "D", "E", "F"]) {
    if (!used.has(letter)) {
      return letter;
    }
  }
  return `V${variants.length + 1}`;
}

export function SequenceStepCard({ campaignId, step }: SequenceStepCardProps) {
  const variants = step.variants ?? [];

  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[40px_1fr]">
      <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
        {step.stepOrder}
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="size-4 text-muted-foreground" />
              <span className="truncate">{step.subject}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{step.body}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex h-6 items-center gap-1 rounded-md border bg-muted/30 px-2">
            <Clock3 className="size-3" />
            Delay {step.delayDaysMin}-{step.delayDaysMax} days
          </span>
          <span className="inline-flex h-6 items-center rounded-md border bg-muted/30 px-2">
            Stop on reply: {step.stopOnReply ? "yes" : "no"}
          </span>
          {variants.length > 0 ? (
            <span className="inline-flex h-6 items-center rounded-md border bg-muted/30 px-2">
              {variants.length + 1} variants (incl. base)
            </span>
          ) : null}
        </div>

        {variants.length > 0 ? (
          <div className="space-y-2 rounded-md border border-dashed p-2">
            {variants.map((variant) => (
              <div key={variant.id} className="flex items-start justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-medium">
                    Variant {variant.label}
                    <span className="ml-2 text-muted-foreground">
                      weight {variant.weight}
                      {variant.isActive ? "" : " · inactive"}
                    </span>
                  </p>
                  <p className="truncate text-muted-foreground">{variant.subject}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={toggleSequenceStepVariantAction}>
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="variantId" value={variant.id} />
                    <input type="hidden" name="isActive" value={variant.isActive ? "false" : "true"} />
                    <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      {variant.isActive ? "Pause" : "Enable"}
                    </Button>
                  </form>
                  <form action={deleteSequenceStepVariantAction}>
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="variantId" value={variant.id} />
                    <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs text-rose-600">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <AddVariantDialog
          campaignId={campaignId}
          sequenceStepId={step.id}
          suggestedLabel={nextLabel(variants)}
        />
      </div>
    </div>
  );
}
