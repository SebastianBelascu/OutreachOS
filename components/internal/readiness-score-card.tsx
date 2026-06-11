import { CheckCircle2, CircleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReadinessScoreCardProps {
  score: number;
  label?: string;
  hint?: string;
}

export function ReadinessScoreCard({
  score,
  label = "Setup readiness",
  hint = "Cat de pregatit e sistemul ca sa trimita fara surprize.",
}: ReadinessScoreCardProps) {
  const ready = score >= 80;
  const Icon = ready ? CheckCircle2 : CircleAlert;

  return (
    <Card className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="relative p-5">
          <div
            className={cn(
              "absolute right-0 top-0 h-28 w-28 rounded-bl-full opacity-15",
              ready ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">{score}%</p>
              <p className="mt-2 max-w-[260px] text-sm leading-6 text-muted-foreground">{hint}</p>
            </div>
            <div
              className={cn(
                "rounded-full border p-2",
                ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              <Icon className="size-5" />
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", ready ? "bg-emerald-500" : "bg-amber-500")}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
