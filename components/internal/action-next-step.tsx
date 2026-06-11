import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SetupStep } from "@/lib/outreach/types";

interface ActionNextStepProps {
  nextAction: SetupStep;
}

export function ActionNextStep({ nextAction }: ActionNextStepProps) {
  return (
    <Card className="rounded-lg border-primary/20 bg-primary text-primary-foreground shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-75">Next best action</p>
          <h2 className="mt-1 text-xl font-semibold">{nextAction.actionLabel}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 opacity-80">{nextAction.description}</p>
        </div>
        <Button asChild variant="secondary" className="shrink-0">
          <Link href={nextAction.href}>
            Open
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
