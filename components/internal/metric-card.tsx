import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Card className="rounded-[24px] border-white/70 bg-white/85 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-600">{hint}</p>
      </CardContent>
    </Card>
  );
}
