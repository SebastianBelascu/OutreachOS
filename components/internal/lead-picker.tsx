"use client";

import { useDeferredValue, useState } from "react";
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
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  const deferredQuery = useDeferredValue(query.toLowerCase());

  const filteredLeads = leads.filter((lead) => {
    const haystack = `${lead.email} ${lead.company ?? ""} ${lead.firstName ?? ""} ${lead.lastName ?? ""}`.toLowerCase();
    return haystack.includes(deferredQuery);
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <UserPlus className="size-4" />
          Add leads
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Add leads to campaign</SheetTitle>
          <SheetDescription>Select leads from the database and enroll them in this campaign.</SheetDescription>
        </SheetHeader>
        <form action={enrollLeadsAction} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="campaignId" value={campaignId} />
          <div className="px-4">
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
              <CommandList className="max-h-[520px]">
                <CommandEmpty>No leads found.</CommandEmpty>
                <CommandGroup>
                  {filteredLeads.map((lead) => (
                    <CommandItem key={lead.id} value={lead.id} className="gap-3">
                      <Checkbox name="leadIds" value={lead.id} />
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
          <SheetFooter className="border-t">
            <Button type="submit">Enroll selected</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
