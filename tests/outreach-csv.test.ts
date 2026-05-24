import assert from "node:assert/strict";
import test from "node:test";

import { previewLeadImport } from "@/lib/outreach/csv";

test("previewLeadImport parses rows and custom fields", () => {
  const summary = previewLeadImport(
    [
      "first_name,last_name,email,company,tags,website,extra_field",
      'Ana,Pop,ana@example.com,Acme,"warm,priority",https://acme.com,ICP-A',
      "Ion,Ionescu,ion@example.com,Bravo,cold,https://bravo.com,ICP-B",
    ].join("\n"),
    ["agency"],
  );

  assert.equal(summary.totalRows, 2);
  assert.equal(summary.validRows, 2);
  assert.equal(summary.invalidRows, 0);
  assert.equal(summary.preview[0]?.email, "ana@example.com");
  assert.deepEqual(summary.preview[0]?.tags, ["warm", "priority", "agency"]);
  assert.deepEqual(summary.preview[0]?.customFields, { extra_field: "ICP-A" });
});

test("previewLeadImport marks duplicate and invalid rows", () => {
  const summary = previewLeadImport(
    [
      "first_name,email",
      "Ana,ana@example.com",
      "Maria,ana@example.com",
      "NoEmail,",
    ].join("\n"),
  );

  assert.equal(summary.totalRows, 3);
  assert.equal(summary.validRows, 1);
  assert.equal(summary.duplicateRows, 1);
  assert.equal(summary.invalidRows, 1);
  assert.equal(summary.errors.length, 1);
});
