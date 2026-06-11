import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey() {
  const raw = process.env.MAILBOX_CREDENTIALS_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "MAILBOX_CREDENTIALS_KEY is not set. Generate one with `openssl rand -base64 32`.",
    );
  }

  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== 32) {
    throw new Error("MAILBOX_CREDENTIALS_KEY must be a base64-encoded 32-byte key.");
  }

  return key;
}

/**
 * Encrypts a secret (e.g. an IMAP password) with AES-256-GCM.
 * Output format: base64(iv):base64(authTag):base64(ciphertext).
 */
export function encryptSecret(plain: string) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(payload: string) {
  const key = getKey();
  const [ivPart, tagPart, dataPart] = payload.split(":");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Malformed encrypted secret.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64")),
    decipher.final(),
  ]);

  return plain.toString("utf8");
}

export function hasCredentialsKey() {
  const raw = process.env.MAILBOX_CREDENTIALS_KEY;
  if (!raw || raw.trim().length === 0) {
    return false;
  }
  return Buffer.from(raw.trim(), "base64").length === 32;
}
