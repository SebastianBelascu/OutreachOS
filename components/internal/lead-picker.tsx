"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Search, UserPlus } from "lucide-react";

import { enrollLeadsAction } from "@/app/(workspace)/actions";
import { StatusBadge } from "@/components/internal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Slimmed-down lead shape the picker needs — plus the two flags that drive eligibility. */
export interface PickerLead {
  id: string;
  email: string;
  company: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  /** How many campaigns this lead is (or was) enrolled in, across the whole workspace. */
  enrolledCount: number;
  /** True when an active suppression entry would stop the lead from being emailed. */
  suppressed: boolean;
}

interface LeadPickerProps {
  campaignId: string;
  leads: PickerLead[];
}

/** A lead is fresh when it has never been in a campaign and isn't suppressed. */
function isFresh(lead: PickerLead) {
  return lead.enrolledCount === 0 && !lead.suppressed;
}

export function LeadPicker({ campaignId, leads }: LeadPickerProps) {
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("50");
  // Hide leads that have already been in a campaign by default — a new campaign wants fresh leads.
  const [hideUsed, setHideUsed] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const deferredQuery = useDeferredValue(query.toLowerCase());

  const searchedLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const haystack =
          `${lead.email} ${lead.company ?? ""} ${lead.firstName ?? ""} ${lead.lastName ?? ""}`.toLowerCase();
        return haystack.includes(deferredQuery);
      }),
    [leads, deferredQuery],
  );

  // What the list actually renders: everything when "show all" is on, only fresh leads otherwise.
  const visibleLeads = useMemo(
    () => (hideUsed ? searchedLeads.filter(isFresh) : searchedLeads),
    [searchedLeads, hideUsed],
  );

  // Leads matching the search that were hidden because they're already used/suppressed.
  const hiddenUsedCount = hideUsed ? searchedLeads.length - visibleLeads.length : 0;
  // Pool the bulk buttons draw from — never auto-selects a used or suppressed lead.
  const freshVisible = useMemo(() => visibleLeads.filter(isFresh), [visibleLeads]);

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

  // Take the first N *fresh* leads from the current view — the "give me an amount" path.
  function selectFirstN() {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    setSelected(new Set(freshVisible.slice(0, n).map((lead) => lead.id)));
  }

  function selectAllFresh() {
    setSelected((prev) => new Set([...prev, ...freshVisible.map((lead) => lead.id)]));
  }

  function clear() {
    setSelected(new Set());
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <UserPlus className="size-4" />
          Add leads
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Add leads to campaign</SheetTitle>
          <SheetDescription>
            Leadurile deja folosite în alte campanii sunt ascunse implicit. Tastează un număr și ia primele N, sau bifează manual.
          </SheetDescription>
        </SheetHeader>
        <form action={enrollLeadsAction} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="campaignId" value={campaignId} />
          {/* Controlled selection → one hidden field per chosen lead, always submitted. */}
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="leadIds" value={id} />
          ))}
          <div className="flex min-h-0 flex-1 flex-col space-y-3 px-4">
            <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/20 p-3">
              <div className="space-y-1">
                <Label htmlFor="leadAmount" className="text-xs">
                  Câte leaduri
                </Label>
                <Input
                  id="leadAmount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-8 w-24"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={selectFirstN}>
                Select first {Math.max(0, Math.floor(Number(amount) || 0))}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={selectAllFresh}>
                Select all noi ({freshVisible.length})
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                Clear
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant={hideUsed ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setHideUsed((value) => !value)}
              >
                {hideUsed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {hideUsed ? "Leaduri folosite: ascunse" : "Leaduri folosite: afișate"}
              </Button>
              {hiddenUsedCount > 0 ? (
                <span className="text-xs text-muted-foreground">{hiddenUsedCount} ascunse (deja folosite)</span>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-md border">
              <div className="flex h-10 items-center gap-2 border-b px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search leads..."
                  className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-[460px] min-h-0 flex-1 overflow-y-auto p-1">
                {visibleLeads.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {hideUsed && hiddenUsedCount > 0
                      ? "Toate leadurile potrivite sunt deja în campanii. Apasă „Leaduri folosite: afișate” ca să le vezi."
                      : "No leads found."}
                  </p>
                ) : (
                  visibleLeads.map((lead) => {
                    const isSelected = selected.has(lead.id);
                    const used = lead.enrolledCount > 0;
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => toggle(lead.id)}
                        className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent/60"
                      >
                        {/* Presentational only — selection is driven by the row button, no Radix state. */}
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary shadow-sm",
                            isSelected && "bg-primary text-primary-foreground",
                          )}
                        >
                          {isSelected ? <Check className="size-3.5" /> : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {lead.company ?? (`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || lead.email)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                        </div>
                        {used ? (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            în {lead.enrolledCount} {lead.enrolledCount === 1 ? "campanie" : "campanii"}
                          </span>
                        ) : null}
                        {lead.suppressed ? <StatusBadge status="SUPPRESSED" /> : <StatusBadge status={lead.status} />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-auto border-t">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {selected.size} selectate · {visibleLeads.length} afișate
                {hiddenUsedCount > 0 ? ` · ${hiddenUsedCount} ascunse` : ""}
              </span>
              <Button type="submit" disabled={selected.size === 0}>
                Enroll {selected.size}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
