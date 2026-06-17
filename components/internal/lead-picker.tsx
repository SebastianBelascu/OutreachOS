"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Lead } from "@prisma/client";
import { Search, UserPlus } from "lucide-react";

import { enrollLeadsAction } from "@/app/(workspace)/actions";
import { StatusBadge } from "@/components/internal/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LeadPickerProps {
  campaignId: string;
  leads: Lead[];
}

export function LeadPicker({ campaignId, leads }: LeadPickerProps) {
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("50");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const deferredQuery = useDeferredValue(query.toLowerCase());

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const haystack =
          `${lead.email} ${lead.company ?? ""} ${lead.firstName ?? ""} ${lead.lastName ?? ""}`.toLowerCase();
        return haystack.includes(deferredQuery);
      }),
    [leads, deferredQuery],
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

  // Take the first N of the *currently filtered* list — the "give me an amount" path.
  function selectFirstN() {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    setSelected(new Set(filteredLeads.slice(0, n).map((lead) => lead.id)));
  }

  function selectAllFiltered() {
    setSelected((prev) => new Set([...prev, ...filteredLeads.map((lead) => lead.id)]));
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
            Pick how many to enroll — type an amount and grab the first N, select all, or tick individual leads.
          </SheetDescription>
        </SheetHeader>
        <form action={enrollLeadsAction} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="campaignId" value={campaignId} />
          {/* Controlled selection → one hidden field per chosen lead, always submitted. */}
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="leadIds" value={id} />
          ))}
          <div className="space-y-3 px-4">
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
              <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                Select all ({filteredLeads.length})
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                Clear
              </Button>
            </div>

            <Command shouldFilter={false} className="rounded-md border">
              <div className="flex h-10 items-center gap-2 border-b px-3">
                <Search className="size-4 text-muted-foreground" />
                <CommandInput
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search leads..."
                  className="h-9"
                />
              </div>
              <CommandList className="max-h-[460px]">
                <CommandEmpty>No leads found.</CommandEmpty>
                <CommandGroup>
                  {filteredLeads.map((lead) => (
                    <CommandItem
                      key={lead.id}
                      value={lead.id}
                      onSelect={() => toggle(lead.id)}
                      className="gap-3"
                    >
                      <Checkbox checked={selected.has(lead.id)} className="pointer-events-none" tabIndex={-1} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {lead.company ?? (`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || lead.email)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
          <SheetFooter className="mt-auto border-t">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {selected.size} selected{" "}
                {filteredLeads.length !== leads.length ? `(of ${filteredLeads.length} shown)` : `of ${leads.length}`}
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
