import { connection } from "next/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasRequiredServerEnv } from "@/lib/env";

const REQUIRED_ITEMS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "BREVO_API_KEY",
  "BREVO_WEBHOOK_BEARER_TOKEN",
  "APP_BASE_URL",
];

export default async function SettingsPage() {
  await connection();
  return (
    <div className="space-y-6">
      <Card className="rounded-[24px] border-white/70 bg-white/85">
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
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-950">{item}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Configure this before enabling live sending or Brevo webhooks.
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
