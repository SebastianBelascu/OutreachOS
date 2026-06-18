"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLeadsAction } from "@/app/(workspace)/actions";
import { DeleteLeadButton } from "@/components/internal/delete-lead-button";
import { StatusBadge } from "@/components/internal/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface LeadRow {
  id: string;
  label: string;
  email: string;
  status: string;
  bestOffer: string | null;
  priority: string | null;
  tags: string;
  enrollmentCount: number;
  suppressed: boolean;
  updatedAt: string;
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const allSelected = leads.length > 0 && selected.size === leads.length;
  const someSelected = selected.size > 0 && !allSelected;
  const headerState = useMemo<boolean | "indeterminate">(
    () => (allSelected ? true : someSelected ? "indeterminate" : false),
    [allSelected, someSelected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === leads.length ? new Set() : new Set(leads.map((lead) => lead.id))));
  }

  function deleteSelected() {
    const ids = [...selected];
    startTransition(async () => {
      const formData = new FormData();
      ids.forEach((id) => formData.append("leadIds", id));
      const result = await deleteLeadsAction(formData);
      if (result.ok) {
        toast.success("Leaduri șterse", { description: result.message });
        setSelected(new Set());
        setConfirmOpen(false);
      } else {
        toast.error("Nu s-au putut șterge", { description: result.message });
      }
    });
  }

  return (
    <div className="overflow-x-auto">
      {selected.size > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} {selected.size === 1 ? "lead selectat" : "leaduri selectate"}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Deselectează
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              Șterge selectate
            </Button>
          </div>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={headerState}
                onCheckedChange={toggleAll}
                aria-label="Selectează toate"
              />
            </TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Offer</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Campaigns</TableHead>
            <TableHead>Suppression</TableHead>
            <TableHead className="text-right">Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const isSelected = selected.has(lead.id);
            return (
              <TableRow key={lead.id} data-state={isSelected ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(lead.id)}
                    aria-label={`Selectează ${lead.label}`}
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                    {lead.label}
                  </Link>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="text-xs">
                  {lead.bestOffer ? (
                    <span className="font-medium">{lead.bestOffer}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                  {lead.priority ? (
                    <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                      {lead.priority}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-[240px] text-xs text-muted-foreground">{lead.tags || "-"}</TableCell>
                <TableCell className="text-sm">{lead.enrollmentCount}</TableCell>
                <TableCell className="text-sm">
                  {lead.suppressed ? (
                    <StatusBadge status="SUPPRESSED" />
                  ) : (
                    <span className="text-muted-foreground">Clear</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{lead.updatedAt}</TableCell>
                <TableCell className="text-right">
                  <DeleteLeadButton
                    leadId={lead.id}
                    leadLabel={lead.label}
                    enrollmentCount={lead.enrollmentCount}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ștergi {selected.size} {selected.size === 1 ? "lead" : "leaduri"}?</DialogTitle>
            <DialogDescription>
              Leadurile selectate vor fi șterse definitiv, împreună cu notițele, tag-urile, înrolările și mesajele lor.
              Acțiunea nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Anulează
            </Button>
            <Button type="button" variant="destructive" onClick={deleteSelected} disabled={pending}>
              {pending ? "Se șterge..." : `Șterge ${selected.size} definitiv`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
