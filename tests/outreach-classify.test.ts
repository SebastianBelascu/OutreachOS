import assert from "node:assert/strict";
import test from "node:test";

import { classifyInbound } from "@/lib/outreach/classify";

test("interested — EN", () => {
  assert.equal(
    classifyInbound({ fromEmail: "a@b.com", subject: "Re: hi", text: "Yes I'm interested, can we set up a call?" }),
    "INTERESTED",
  );
});

test("interested — RO", () => {
  assert.equal(
    classifyInbound({ fromEmail: "a@b.com", text: "Trimite-mi te rog o oferta si detalii de pret." }),
    "INTERESTED",
  );
});

test("not interested — RO with diacritics", () => {
  assert.equal(
    classifyInbound({ fromEmail: "a@b.com", text: "Nu ne intereseaza, mulțumesc." }),
    "NOT_INTERESTED",
  );
});

test("unsubscribe request — EN", () => {
  assert.equal(
    classifyInbound({ fromEmail: "a@b.com", text: "Please unsubscribe me from this list." }),
    "UNSUBSCRIBE_REQUEST",
  );
});

test("bounce notification — mailer-daemon", () => {
  assert.equal(
    classifyInbound({
      fromEmail: "mailer-daemon@google.com",
      subject: "Delivery Status Notification (Failure)",
      text: "address not found",
    }),
    "BOUNCE_NOTIFICATION",
  );
});

test("out of office — RO", () => {
  assert.equal(
    classifyInbound({ fromEmail: "a@b.com", subject: "Raspuns automat", text: "Sunt in concediu, revin pe 1 august." }),
    "OUT_OF_OFFICE",
  );
});

test("auto reply via header", () => {
  assert.equal(
    classifyInbound({
      fromEmail: "a@b.com",
      subject: "Thanks",
      text: "We received your message.",
      headers: { "auto-submitted": "auto-replied" },
    }),
    "AUTO_REPLY",
  );
});

test("neutral fallback", () => {
  assert.equal(classifyInbound({ fromEmail: "a@b.com", text: "ok" }), "NEUTRAL");
});
