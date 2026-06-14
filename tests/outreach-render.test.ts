import assert from "node:assert/strict";
import test from "node:test";

import { collapseBlankLines } from "@/lib/outreach/render";

test("collapseBlankLines removes the gap left by an empty optional variable", () => {
  // What "Hi {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nBody" renders to
  // when first_line is present but observation is empty.
  const rendered = "Hi Ana,\n\nLoved your launch.\n\n\n\nBody";
  assert.equal(collapseBlankLines(rendered), "Hi Ana,\n\nLoved your launch.\n\nBody");
});

test("collapseBlankLines trims trailing spaces and surrounding whitespace", () => {
  assert.equal(collapseBlankLines("\n\nHello   \nthere\n\n"), "Hello\nthere");
});
