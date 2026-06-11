import assert from "node:assert/strict";
import test from "node:test";

process.env.MAILBOX_CREDENTIALS_KEY = Buffer.alloc(32, 7).toString("base64");

import { decryptSecret, encryptSecret, hasCredentialsKey } from "@/lib/outreach/crypto";

test("encrypt/decrypt round-trips", () => {
  const secret = "imap-app-password-123";
  const encrypted = encryptSecret(secret);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptSecret(encrypted), secret);
});

test("ciphertext is non-deterministic (random IV)", () => {
  assert.notEqual(encryptSecret("same"), encryptSecret("same"));
});

test("tampered ciphertext fails authentication", () => {
  const encrypted = encryptSecret("hunter2");
  const parts = encrypted.split(":");
  parts[1] = (parts[1][0] === "A" ? "B" : "A") + parts[1].slice(1);
  assert.throws(() => decryptSecret(parts.join(":")));
});

test("hasCredentialsKey reflects a valid 32-byte key", () => {
  assert.equal(hasCredentialsKey(), true);
});
