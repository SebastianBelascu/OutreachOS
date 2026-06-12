import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";

import { verifySendingDomainAction } from "@/app/(workspace)/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

interface DnsCheckShape {
  pass?: boolean;
  found?: string | null;
  selector?: string | null;
  checkedAt?: string;
}

interface DomainSetupChecklistProps {
  domainId: string;
  purpose: string;
  isPrimary: boolean;
  dnsChecklist: unknown;
  lastVerifiedAt: Date | string | null;
}

function readCheck(checklist: Record<string, unknown> | null, key: string): DnsCheckShape | null {
  if (!checklist) {
    return null;
  }
  const value = checklist[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as DnsCheckShape;
  }
  return null;
}

export function DomainSetupChecklist({
  domainId,
  purpose,
  isPrimary,
  dnsChecklist,
  lastVerifiedAt,
}: DomainSetupChecklistProps) {
  const checklist =
    dnsChecklist && typeof dnsChecklist === "object" && !Array.isArray(dnsChecklist)
      ? (dnsChecklist as Record<string, unknown>)
      : null;

  const rows = [
    { key: "spf", label: "SPF authorizes sender" },
    { key: "dkim", label: "DKIM record present" },
    { key: "dmarc", label: "DMARC policy" },
    { key: "mx", label: "MX records" },
  ] as const;

  return (
    <div className="space-y-3">
      {isPrimary || purpose === "BRAND" ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="size-4" />
          <AlertTitle>Brand-domain risk</AlertTitle>
          <AlertDescription>
            Prefer a dedicated outreach domain so cold campaigns do not put the main brand reputation on the line.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        {rows.map((row) => {
          const check = readCheck(checklist, row.key);
          const verified = check !== null;
          const pass = check?.pass === true;
          const Icon = !verified ? AlertTriangle : pass ? CheckCircle2 : XCircle;
          const tone = !verified
            ? "text-muted-foreground"
            : pass
              ? "text-emerald-600"
              : "text-rose-600";
          return (
            <div key={row.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className={`size-3.5 ${tone}`} />
              <span>{row.label}</span>
              {row.key === "dkim" && check?.selector ? (
                <span className="text-[10px] text-muted-foreground/70">({check.selector})</span>
              ) : null}
              {!verified ? <span className="text-[10px] text-muted-foreground/70">not checked</span> : null}
            </div>
          );
        })}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          <span>App unsubscribe endpoint</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground/70">
          {lastVerifiedAt ? `Checked ${formatDateTime(lastVerifiedAt)}` : "Never verified"}
        </span>
        <form action={verifySendingDomainAction}>
          <input type="hidden" name="domainId" value={domainId} />
          <Button type="submit" size="sm" variant="outline" className="h-7 gap-1 text-xs">
            <RefreshCw className="size-3" />
            Verify now
          </Button>
        </form>
      </div>
    </div>
  );
}
