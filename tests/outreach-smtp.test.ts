import assert from "node:assert/strict";
import test from "node:test";

import { isSmtpConfigured } from "@/lib/outreach/smtp";

const base = {
  fromEmail: "a@b.com",
  fromName: "A",
  replyTo: null,
  smtpHost: null,
  smtpPort: 587,
  smtpSecure: false,
  smtpUsername: null,
  smtpPasswordEnc: null,
};

test("isSmtpConfigured requires host, username and password", () => {
  assert.equal(isSmtpConfigured(base), false);
  assert.equal(isSmtpConfigured({ ...base, smtpHost: "smtp.gmail.com" }), false);
  assert.equal(isSmtpConfigured({ ...base, smtpHost: "smtp.gmail.com", smtpUsername: "a@b.com" }), false);
  assert.equal(
    isSmtpConfigured({
      ...base,
      smtpHost: "smtp.gmail.com",
      smtpUsername: "a@b.com",
      smtpPasswordEnc: "iv:tag:cipher",
    }),
    true,
  );
});
