import assert from "node:assert/strict";
import test from "node:test";

import { getMailboxRampCap } from "@/lib/outreach/mailboxes";
import { buildLeadTemplateParams, findMissingTemplateVariables } from "@/lib/outreach/variables";

test("buildLeadTemplateParams exposes custom lead fields as variables", () => {
  const params = buildLeadTemplateParams({
    firstName: "Ana",
    lastName: null,
    email: "ana@example.com",
    company: "Acme",
    website: null,
    industry: null,
    country: null,
    linkedinUrl: null,
    customFields: {
      segment: "ICP-A",
      pitch_angle: "ops",
    },
  } as never);

  assert.equal(params.first_name, "Ana");
  assert.equal(params.segment, "ICP-A");
  assert.equal(params.pitch_angle, "ops");
});

test("findMissingTemplateVariables reports unavailable variables", () => {
  assert.deepEqual(
    findMissingTemplateVariables("Hey {{first_name}} from {{company}} in {{unknown_field}}", {
      first_name: "Ana",
      company: "Acme",
    }),
    ["unknown_field"],
  );
});

test("getMailboxRampCap respects ramp and max daily caps", () => {
  const createdAt = new Date("2026-05-20T00:00:00.000Z");
  const now = new Date("2026-05-23T00:00:00.000Z");

  assert.equal(
    getMailboxRampCap(
      {
        createdAt,
        dailyCap: 100,
        rampStart: 5,
        rampIncrement: 10,
        maxDailyCap: 30,
      },
      now,
    ),
    30,
  );
});
