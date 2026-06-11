import assert from "node:assert/strict";
import test from "node:test";

import { previewLeadImport } from "@/lib/outreach/csv";

const LEADHUB_CSV = [
  "company_name,domain,emails,offer_angle,first_line,observation,entry_offer,priority,is_competitor,validation_status,seo_signals",
  'Acme SRL,acme.ro,office@acme.ro|sales@acme.ro,Conversion Infrastructure,"Salut,\nam vazut site-ul vostru",CTA slab pe homepage,Revenue Leak Audit,A,false,validated,"slow site|no cta"',
  "Rival SRL,rival.ro,x@rival.ro,AI SDR Infrastructure,hello,obs,Blueprint,B,true,validated,",
  "Pending SRL,pending.ro,y@pending.ro,AI SEO Infrastructure,hello,obs,Map,C,false,rejected,",
].join("\n");

test("lead-hub export is detected and mapped", () => {
  const summary = previewLeadImport(LEADHUB_CSV, ["wave1"]);

  assert.equal(summary.detectedFormat, "lead-hub");
  assert.equal(summary.validRows, 1);
  // Competitor (Rival) and non-validated (Pending) are skipped, not invalid.
  assert.equal(summary.skippedRows, 2);

  const row = summary.preview[0];
  assert.equal(row?.email, "office@acme.ro"); // first pipe-separated address
  assert.equal(row?.company, "Acme SRL");
  assert.equal(row?.website, "https://acme.ro"); // derived from domain
  assert.equal(row?.bestOffer, "Conversion Infrastructure");
  assert.equal(row?.priority, "A");
});

test("lead-hub multiline cells survive parsing and become variables", () => {
  const summary = previewLeadImport(LEADHUB_CSV);
  const row = summary.preview[0];
  assert.equal(row?.customFields.first_line, "Salut,\nam vazut site-ul vostru");
  assert.equal(row?.customFields.observation, "CTA slab pe homepage");
  assert.equal(row?.customFields.entry_offer, "Revenue Leak Audit");
});

test("lead-hub auto-tags by offer, priority and source", () => {
  const summary = previewLeadImport(LEADHUB_CSV, ["wave1"]);
  const tags = summary.preview[0]?.tags ?? [];
  assert.ok(tags.includes("source:lead-hub"));
  assert.ok(tags.includes("priority:A"));
  assert.ok(tags.includes("wave1"));
  assert.ok(tags.some((tag) => tag.startsWith("offer:")));
});

test("generic CSV import still works unchanged", () => {
  const summary = previewLeadImport(
    ["first_name,email,company", "Ana,ana@example.com,Acme"].join("\n"),
  );
  assert.equal(summary.detectedFormat, "generic");
  assert.equal(summary.validRows, 1);
  assert.equal(summary.preview[0]?.firstName, "Ana");
});
