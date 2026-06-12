import { connection } from "next/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasRequiredServerEnv } from "@/lib/env";

const REQUIRED_ITEMS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "APP_BASE_URL",
];

const OPTIONAL_ITEMS = [
  "MAILBOX_CREDENTIALS_KEY",
  "BREVO_API_KEY",
  "BREVO_WEBHOOK_BEARER_TOKEN",
];

export default async function SettingsPage() {
  await connection();
  return (
    <div className="space-y-6">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Infrastructure readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Environment status:{" "}
            <span className="font-medium text-slate-950">
              {hasRequiredServerEnv() ? "ready for runtime wiring" : "missing required env values"}
            </span>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {REQUIRED_ITEMS.map((item) => (
              <div key={item} className="rounded-md border bg-muted/30 p-4">
                <p className="font-medium">{item}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Configure this before enabling the app runtime.
                </p>
              </div>
            ))}
            {OPTIONAL_ITEMS.map((item) => (
              <div key={item} className="rounded-md border bg-muted/30 p-4">
                <p className="font-medium">{item}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Needed for SMTP credential encryption or optional Brevo API/webhooks.
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
