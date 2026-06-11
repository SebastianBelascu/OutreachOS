import { getServerEnv } from "@/lib/env";

export interface BrevoSendPayload {
  sender: {
    email: string;
    name: string;
  };
  replyTo?: {
    email: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  subject: string;
  htmlContent: string;
  tags: string[];
  headers?: Record<string, string>;
}

interface BrevoSendResponse {
  messageId: string;
}

export class BrevoSendError extends Error {
  readonly status: number;
  /** True for 429/5xx — transient errors worth retrying with backoff. */
  readonly retryable: boolean;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BrevoSendError";
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

export async function sendBrevoTransactionalEmail(payload: BrevoSendPayload) {
  const env = getServerEnv();

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new BrevoSendError(response.status, `Brevo send failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as BrevoSendResponse;
}

export interface BrevoTransactionalWebhookPayload {
  event: string;
  email?: string;
  id?: number;
  date?: string;
  ts?: number;
  "message-id"?: string;
  ts_event?: number;
  subject?: string;
  tags?: string[];
  tag?: string;
  reason?: string;
  [key: string]: unknown;
}

export function mapBrevoEventType(event: string) {
  const eventMap: Record<string, string> = {
    sent: "SENT",
    delivered: "DELIVERED",
    opened: "OPENED",
    click: "CLICKED",
    clicked: "CLICKED",
    softBounce: "SOFT_BOUNCE",
    hardBounce: "HARD_BOUNCE",
    invalid: "INVALID",
    deferred: "DEFERRED",
    complaint: "COMPLAINT",
    unsubscribed: "UNSUBSCRIBED",
    blocked: "BLOCKED",
    error: "ERROR",
  };

  return eventMap[event] ?? "ERROR";
}
