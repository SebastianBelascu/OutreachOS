const requiredServerEnv = [
  "DATABASE_URL",
  "DIRECT_URL",
  "BREVO_API_KEY",
  "BREVO_WEBHOOK_BEARER_TOKEN",
  "APP_BASE_URL",
] as const;

function readEnvValue(key: string) {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export function getServerEnv() {
  return {
    databaseUrl: readEnvValue(requiredServerEnv[0]),
    directUrl: readEnvValue(requiredServerEnv[1]),
    brevoApiKey: readEnvValue(requiredServerEnv[2]),
    brevoWebhookBearerToken: readEnvValue(requiredServerEnv[3]),
    appBaseUrl: readEnvValue(requiredServerEnv[4]),
  };
}

export function hasRequiredServerEnv() {
  return requiredServerEnv.every((key) => {
    const value = process.env[key];
    return Boolean(value && value.trim().length > 0);
  });
}

function readOptionalNumber(key: string, fallback: number) {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Optional operational settings that don't block boot when absent.
 */
export function getOptionalEnv() {
  return {
    cronSecret: process.env.CRON_SECRET ?? null,
    mailboxCredentialsKey: process.env.MAILBOX_CREDENTIALS_KEY ?? null,
    guardrailBounceRate: readOptionalNumber("GUARDRAIL_BOUNCE_RATE", 0.05),
    guardrailComplaintRate: readOptionalNumber("GUARDRAIL_COMPLAINT_RATE", 0.001),
    guardrailWarnBounceRate: readOptionalNumber("GUARDRAIL_WARN_BOUNCE_RATE", 0.03),
    guardrailMinVolume: readOptionalNumber("GUARDRAIL_MIN_VOLUME", 30),
  };
}
