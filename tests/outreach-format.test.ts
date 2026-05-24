import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEventKey,
  isWithinSendWindow,
  normalizeEmail,
  splitCommaValues,
} from "@/lib/outreach/format";

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  John.Doe@Example.COM "), "john.doe@example.com");
});

test("splitCommaValues removes blanks", () => {
  assert.deepEqual(splitCommaValues("cold, saas, ,priority"), ["cold", "saas", "priority"]);
});

test("buildEventKey is deterministic", () => {
  assert.equal(
    buildEventKey("DELIVERED", "abc123", 42),
    "DELIVERED:abc123:42",
  );
});

test("isWithinSendWindow respects timezone and business hours", () => {
  const date = new Date("2026-05-25T08:15:00.000Z");
  assert.equal(
    isWithinSendWindow(date, "Europe/Bucharest", {
      days: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 17,
    }),
    true,
  );

  assert.equal(
    isWithinSendWindow(date, "Europe/Bucharest", {
      days: [1, 2, 3, 4, 5],
      startHour: 12,
      endHour: 17,
    }),
    false,
  );
});
