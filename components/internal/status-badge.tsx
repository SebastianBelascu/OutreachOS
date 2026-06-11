import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-blue-200 bg-blue-50 text-blue-700",
  NEW: "border-slate-200 bg-slate-50 text-slate-700",
  CONTACTED: "border-blue-200 bg-blue-50 text-blue-700",
  OPENED: "border-cyan-200 bg-cyan-50 text-cyan-700",
  REPLIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INTERESTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEETING_BOOKED: "border-violet-200 bg-violet-50 text-violet-700",
  NOT_INTERESTED: "border-slate-200 bg-slate-50 text-slate-500",
  BOUNCED: "border-red-200 bg-red-50 text-red-700",
  COLD: "border-slate-200 bg-slate-50 text-slate-700",
  WARMING: "border-amber-200 bg-amber-50 text-amber-700",
  SENT: "border-blue-200 bg-blue-50 text-blue-700",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLAIMED: "border-amber-200 bg-amber-50 text-amber-700",
  SCHEDULED: "border-slate-200 bg-slate-50 text-slate-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  SUPPRESSED: "border-red-200 bg-red-50 text-red-700",
  NEEDS_SETUP: "border-amber-200 bg-amber-50 text-amber-700",
  AUTHENTICATING: "border-blue-200 bg-blue-50 text-blue-700",
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RISK: "border-orange-200 bg-orange-50 text-orange-700",
  OUTREACH: "border-sky-200 bg-sky-50 text-sky-700",
  BRAND: "border-violet-200 bg-violet-50 text-violet-700",
  INTERNAL: "border-slate-200 bg-slate-50 text-slate-700",
  UNVERIFIED: "border-amber-200 bg-amber-50 text-amber-700",
  HEALTHY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WARNING: "border-orange-200 bg-orange-50 text-orange-700",
  UNHEALTHY: "border-red-200 bg-red-50 text-red-700",
  NOT_CONFIGURED: "border-slate-200 bg-slate-50 text-slate-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
  UNCLASSIFIED: "border-slate-200 bg-slate-50 text-slate-500",
  AUTO_REPLY: "border-slate-200 bg-slate-50 text-slate-500",
  OUT_OF_OFFICE: "border-slate-200 bg-slate-50 text-slate-500",
  BOUNCE_NOTIFICATION: "border-red-200 bg-red-50 text-red-700",
  UNSUBSCRIBE_REQUEST: "border-orange-200 bg-orange-50 text-orange-700",
  NEUTRAL: "border-slate-200 bg-slate-50 text-slate-700",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md px-2 text-[11px] font-medium",
        STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-700",
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
