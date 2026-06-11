import assert from "node:assert/strict";
import test from "node:test";

import { renderSpintax } from "@/lib/outreach/render";

test("spintax is deterministic for the same seed", () => {
  const template = "{Hi|Hello|Hey} {{first_name}}, {quick question|one idea}";
  assert.equal(renderSpintax(template, "seed-1"), renderSpintax(template, "seed-1"));
});

test("spintax resolves to one of the options", () => {
  const out = renderSpintax("{alpha|beta|gamma}", "x");
  assert.ok(["alpha", "beta", "gamma"].includes(out));
});

test("spintax leaves {{ variables }} untouched", () => {
  assert.equal(renderSpintax("Hi {{first_name}} at {{company}}", "s"), "Hi {{first_name}} at {{company}}");
});

test("spintax handles nesting and leaves no braces", () => {
  const out = renderSpintax("{{x|y}|z}", "seed-nested");
  assert.ok(!out.includes("{"));
  assert.ok(!out.includes("}"));
  assert.ok(["x", "y", "z"].includes(out));
});

test("different seeds can produce different picks", () => {
  const template = "{a|b|c|d|e|f|g|h}";
  const outputs = new Set(
    Array.from({ length: 20 }, (_, index) => renderSpintax(template, `seed-${index}`)),
  );
  assert.ok(outputs.size > 1);
});
