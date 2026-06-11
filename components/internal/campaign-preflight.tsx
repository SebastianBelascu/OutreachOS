import { CheckCircle2, CircleAlert } from "lucide-react";
import type { Campaign, CampaignMailbox, Mailbox, SequenceStep, CampaignEnrollment, SendingDomain } from "@prisma/client";

import { activateCampaignAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";

interface CampaignPreflightProps {
  campaign: Campaign & {
    mailbox: Mailbox;
    mailboxPool: Array<CampaignMailbox & {
      mailbox: Mailbox & {
        domain: SendingDomain | null;
      };
    }>;
    steps: SequenceStep[];
    enrollments: CampaignEnrollment[];
  };
}

export function CampaignPreflight({ campaign }: CampaignPreflightProps) {
  const readyPool = campaign.mailboxPool.filter(({ isActive, mailbox }) => {
    const domainReady = !mailbox.domain || mailbox.domain.status === "READY";
    return (
      isActive &&
      mailbox.isActive &&
      domainReady &&
      mailbox.warmupState !== "PAUSED" &&
      ["HEALTHY", "WARNING"].includes(mailbox.healthStatus)
    );
  });
  const checks = [
    {
      label: "At least one mailbox is ready",
      pass: readyPool.length > 0,
    },
    {
      label: "Sequence has at least one step",
      pass: campaign.steps.length > 0,
    },
    {
      label: "Leads are enrolled",
      pass: campaign.enrollments.length > 0,
    },
    {
      label: "Daily limit is configured",
      pass: campaign.dailyLimit > 0,
    },
    {
      label: "Mailbox pool has rotation capacity",
      pass: readyPool.some(({ mailbox }) => mailbox.dailyCap > 0 && mailbox.rotationWeight > 0),
    },
  ];
  const canLaunch = checks.every((check) => check.pass);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        {checks.map((check) => {
          const Icon = check.pass ? CheckCircle2 : CircleAlert;
          return (
            <div key={check.label} className="flex items-center gap-3 border-b p-4 last:border-b-0">
              <Icon className={check.pass ? "size-4 text-emerald-600" : "size-4 text-amber-600"} />
              <span className="text-sm font-medium">{check.label}</span>
            </div>
          );
        })}
      </div>
      <form action={activateCampaignAction}>
        <input type="hidden" name="campaignId" value={campaign.id} />
        <Button type="submit" disabled={!canLaunch}>
          Activate campaign
        </Button>
      </form>
    </div>
  );
}
