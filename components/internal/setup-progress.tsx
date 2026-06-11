import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SetupStep } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";

interface SetupProgressProps {
  steps: SetupStep[];
}

export function SetupProgress({ steps }: SetupProgressProps) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Setup path</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.complete ? CheckCircle2 : Circle;
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Icon className={cn("size-5", step.complete ? "text-emerald-600" : "text-muted-foreground")} />
                {index < steps.length - 1 ? <div className="mt-1 h-8 w-px bg-border" /> : null}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{step.label}</p>
                  {!step.complete ? (
                    <Button asChild variant="outline" size="sm" className="h-7">
                      <Link href={step.href}>{step.actionLabel}</Link>
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
