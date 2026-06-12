import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/outreach/auth";

export default async function Home() {
  await connection();
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#161312,_#2d1b16_40%,_#f56f46_140%)] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between">
        <div className="flex items-center justify-between">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">OutreachOS</p>
          <div className="flex gap-3">
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-white/90">
              <Link href="/auth/sign-up">Create operator</Link>
            </Button>
          </div>
        </div>

        <section className="grid gap-8 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-orange-200">Internal lead operating system</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
              Own the pipeline, own the send, own the data.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
              OutreachOS centralizes lead ops, campaigns, mailboxes, scheduling, and event tracking on top of Supabase, Postgres, and SMTP senders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-white px-6 text-slate-950 hover:bg-white/90">
                <Link href="/auth/login">Enter workspace</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
                <Link href="/auth/sign-up">Invite first operator</Link>
              </Button>
            </div>
          </div>

          <Card className="rounded-[32px] border border-white/10 bg-white/10 text-white shadow-[0_25px_90px_rgba(0,0,0,0.25)] backdrop-blur">
            <CardContent className="grid gap-5 p-8 text-sm">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Core</p>
                <p className="mt-2 text-lg font-medium">Leads, campaigns, sequences, and queue-driven sending.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Infra</p>
                <p className="mt-2 text-lg font-medium">SMTP delivery, Prisma models, event audit trail, internal unsubscribe.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Why it exists</p>
                <p className="mt-2 text-lg font-medium">Lower SaaS cost, tighter control, faster iteration, agency-grade leverage.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
