import { CheckCircle2, Circle, Send } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { CampaignProgressSnapshot } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";

interface CampaignProgressRailProps {
  progress: CampaignProgressSnapshot;
}

export function CampaignProgressRail({ progress }: CampaignProgressRailProps) {
  const steps = [
    { label: "Sequence", complete: progress.sequenceReady, hint: "Ce spui" },
    { label: "Leads", complete: progress.leadsReady, hint: "Cui spui" },
    { label: "Launch", complete: progress.launchReady, hint: "Cand trimiti" },
    { label: "Sending", complete: progress.sendingStarted, hint: "Cron lucreaza" },
  ];

  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Campaign progress</p>
            <p className="mt-1 text-2xl font-semibold">{progress.progressPercent}% ready</p>
          </div>
          <div className="grid flex-1 gap-3 md:grid-cols-4 lg:max-w-3xl">
            {steps.map((step) => {
              const Icon = step.complete ? CheckCircle2 : step.label === "Sending" ? Send : Circle;
              return (
                <div key={step.label} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", step.complete ? "text-emerald-600" : "text-muted-foreground")} />
                    <p className="text-sm font-medium">{step.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{step.hint}</p>
                </div>
              );
            })}
          </div>
        </div>
        {progress.blockers.length ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {progress.blockers[0]}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
