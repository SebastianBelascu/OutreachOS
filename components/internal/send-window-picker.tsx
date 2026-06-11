"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEKDAYS = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "7", label: "Sun" },
];

const HOURS = Array.from({ length: 24 }, (_, index) => String(index));

interface SendWindowPickerProps {
  defaultDays?: string[];
  defaultStartHour?: string;
  defaultEndHour?: string;
}

export function SendWindowPicker({
  defaultDays = ["1", "2", "3", "4", "5"],
  defaultStartHour = "9",
  defaultEndHour = "17",
}: SendWindowPickerProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3 md:col-span-2">
      <div>
        <Label className="text-sm font-medium">Send window</Label>
        <p className="mt-1 text-xs text-muted-foreground">Used by the scheduler before claiming messages.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => (
          <Label
            key={day.value}
            className="flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-xs font-medium"
          >
            <Checkbox
              name="sendWindowDays"
              value={day.value}
              defaultChecked={defaultDays.includes(day.value)}
              className="size-3.5"
            />
            {day.label}
          </Label>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Select name="sendWindowStartHour" defaultValue={defaultStartHour}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Start hour" />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour.padStart(2, "0")}:00
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="sendWindowEndHour" defaultValue={defaultEndHour}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="End hour" />
          </SelectTrigger>
          <SelectContent>
            {HOURS.slice(1).concat("24").map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour.padStart(2, "0")}:00
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
