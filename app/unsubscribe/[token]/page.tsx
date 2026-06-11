import Link from "next/link";
import { connection } from "next/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { unsubscribeMessageByToken } from "@/lib/outreach/messages";

interface UnsubscribePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
  await connection();
  const { token } = await params;
  const result = await unsubscribeMessageByToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader>
          <CardTitle>{result ? "You're unsubscribed" : "Link unavailable"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>
            {result
              ? "We marked your address as unsubscribed and cancelled any future scheduled follow-ups."
              : "This unsubscribe token is invalid or has already been processed."}
          </p>
          <Link href="/" className="font-medium text-slate-950 hover:underline">
            Return to OutreachOS
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
