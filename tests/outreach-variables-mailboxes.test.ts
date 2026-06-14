import assert from "node:assert/strict";
import test from "node:test";

import { getMailboxRampCap } from "@/lib/outreach/mailboxes";
import {
  buildLeadTemplateParams,
  findMissingPersonalization,
  findMissingTemplateVariables,
  firstNameFromEmail,
} from "@/lib/outreach/variables";

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

test("firstNameFromEmail derives a name and skips role inboxes", () => {
  assert.equal(firstNameFromEmail("andrei.popescu@firma.ro"), "Andrei");
  assert.equal(firstNameFromEmail("john+promo@example.com"), "John");
  assert.equal(firstNameFromEmail("MARIA_IONESCU@x.com"), "Maria");
  assert.equal(firstNameFromEmail("office@firma.ro"), null);
  assert.equal(firstNameFromEmail("contact@firma.ro"), null);
  assert.equal(firstNameFromEmail("j@firma.ro"), null);
  assert.equal(firstNameFromEmail(""), null);
});

test("buildLeadTemplateParams falls back to the email-derived first name", () => {
  const params = buildLeadTemplateParams({
    firstName: null,
    lastName: null,
    email: "ana.pop@example.com",
    company: null,
    website: null,
    industry: null,
    country: null,
    linkedinUrl: null,
    customFields: null,
  } as never);

  assert.equal(params.first_name, "Ana");
});

test("findMissingPersonalization flags only required vars the template uses", () => {
  // Template uses {{first_line}} but the lead has none -> held.
  assert.deepEqual(
    findMissingPersonalization("Hi {{first_name}},\n\n{{first_line}}", { first_name: "Ana" }),
    ["first_line"],
  );
  // Same template, lead has the personalization line -> not held.
  assert.deepEqual(
    findMissingPersonalization("Hi {{first_name}},\n\n{{first_line}}", {
      first_name: "Ana",
      first_line: "Loved your latest launch.",
    }),
    [],
  );
  // Template doesn't reference the required var -> never held on it.
  assert.deepEqual(findMissingPersonalization("Hi {{first_name}}", { first_name: "Ana" }), []);
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
