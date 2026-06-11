import assert from "node:assert/strict";
import test from "node:test";

import { createSeededRng, weightedIndex } from "@/lib/outreach/format";

test("weightedIndex stays within bounds", () => {
  assert.equal(weightedIndex([1, 1], 0), 0);
  assert.equal(weightedIndex([1, 1], 0.99), 1);
  assert.equal(weightedIndex([5, 1], 0.1), 0);
});

test("weightedIndex respects heavier weights", () => {
  const weights = [9, 1];
  let zeros = 0;
  for (let i = 0; i < 100; i += 1) {
    if (weightedIndex(weights, i / 100) === 0) {
      zeros += 1;
    }
  }
  // ~90% should land on index 0.
  assert.ok(zeros >= 80, `expected >=80 zeros, got ${zeros}`);
});

test("createSeededRng is deterministic for the same seed", () => {
  assert.equal(createSeededRng("enroll:step")(), createSeededRng("enroll:step")());
});

test("createSeededRng differs across seeds", () => {
  assert.notEqual(createSeededRng("a")(), createSeededRng("b")());
});
