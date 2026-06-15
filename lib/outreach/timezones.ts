// Send-window timezones offered in the campaign / mailbox settings UI. The value is
// an IANA zone passed straight to Intl in isWithinSendWindow; the label is operator-facing.
export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "US Eastern — New York" },
  { value: "America/Chicago", label: "US Central — Chicago" },
  { value: "America/Denver", label: "US Mountain — Denver" },
  { value: "America/Phoenix", label: "US Arizona — Phoenix" },
  { value: "America/Los_Angeles", label: "US Pacific — Los Angeles" },
  { value: "Europe/London", label: "Europe — London" },
  { value: "Europe/Bucharest", label: "Europe — Bucharest" },
  { value: "UTC", label: "UTC" },
] as const;

/** Returns the option list, prepending the current value if it isn't already present. */
export function timezoneOptionsWith(current: string) {
  return TIMEZONE_OPTIONS.some((tz) => tz.value === current)
    ? [...TIMEZONE_OPTIONS]
    : [{ value: current, label: current }, ...TIMEZONE_OPTIONS];
}
