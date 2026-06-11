import type { VariantPerformanceRow } from "@/lib/outreach/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VariantPerformanceTableProps {
  rows: VariantPerformanceRow[];
}

function pct(part: number, total: number) {
  if (total === 0) {
    return "—";
  }
  return `${((part / total) * 100).toFixed(0)}%`;
}

export function VariantPerformanceTable({ rows }: VariantPerformanceTableProps) {
  // Only worth showing once at least one step has more than the base copy.
  const hasVariants = rows.some((row) => row.variantId !== null);
  if (!hasVariants) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">A/B performance</p>
        <p className="text-xs text-muted-foreground">Per step variant — open/click/reply rates over sent.</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Open</TableHead>
              <TableHead className="text-right">Click</TableHead>
              <TableHead className="text-right">Reply</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.sequenceStepId}-${row.variantId ?? "base"}`}>
                <TableCell>Step {row.stepOrder}</TableCell>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right">{row.sent}</TableCell>
                <TableCell className="text-right">{pct(row.opened, row.sent)}</TableCell>
                <TableCell className="text-right">{pct(row.clicked, row.sent)}</TableCell>
                <TableCell className="text-right">{pct(row.replied, row.sent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
