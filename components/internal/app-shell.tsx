import Link from "next/link";
import { BarChart3, Boxes, Inbox, LayoutDashboard, Mail, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/mailboxes", label: "Mailboxes", icon: Boxes },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

interface InternalAppShellProps {
  pathname: string;
  headline?: string;
  eyebrow?: string;
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

export function InternalAppShell({
  pathname,
  headline,
  eyebrow,
  userName,
  userRole,
  children,
}: InternalAppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,126,87,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(0,148,255,0.12),_transparent_24%),linear-gradient(180deg,_rgba(245,241,235,1),_rgba(255,255,255,1))] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="rounded-[28px] border border-white/60 bg-white/80 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur lg:w-[280px]">
          <div className="space-y-4">
            <div className="rounded-[24px] bg-slate-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.28em] text-white/60">OutreachOS</p>
              <h1 className="mt-3 text-2xl font-semibold">SmartFusion outbound ops</h1>
              <p className="mt-3 text-sm text-white/70">
                Internal sending, sequences, and lead operations with full ownership.
              </p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Operator</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{userName}</p>
              <Badge className="mt-2 bg-orange-100 text-orange-900 hover:bg-orange-100">
                {userRole}
              </Badge>
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-950 text-white shadow-lg"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex-1">
          <header className="mb-6 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {eyebrow ?? "Internal lead operating system"}
            </p>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {headline ?? "Outbound command center"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Build and operate campaigns, keep sending disciplined, and keep the data in-house.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Brevo drives delivery, Postgres remains the source of truth.
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
