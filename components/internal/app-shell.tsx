"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Globe2,
  Inbox,
  LayoutDashboard,
  Mail,
  MessagesSquare,
  Search,
  Settings2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    eyebrow: "Command center",
    headline: "Outbound overview",
  },
  {
    href: "/leads",
    label: "Leads",
    icon: Inbox,
    eyebrow: "Lead database",
    headline: "Leads",
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    icon: Mail,
    eyebrow: "Campaign operations",
    headline: "Campaigns",
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: MessagesSquare,
    eyebrow: "Unified replies",
    headline: "Inbox",
  },
  {
    href: "/mailboxes",
    label: "Mailboxes",
    icon: Boxes,
    eyebrow: "Sending infrastructure",
    headline: "Mailboxes",
  },
  {
    href: "/domains",
    label: "Domains",
    icon: Globe2,
    eyebrow: "Domain health",
    headline: "Sending domains",
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    eyebrow: "Performance tracking",
    headline: "Analytics",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2,
    eyebrow: "Workspace setup",
    headline: "Settings",
  },
];

interface InternalAppShellProps {
  headline?: string;
  eyebrow?: string;
  userName: string;
  userRole: string;
  unreadInbox?: number;
  children: React.ReactNode;
}

export function InternalAppShell({
  headline,
  eyebrow,
  userName,
  userRole,
  unreadInbox = 0,
  children,
}: InternalAppShellProps) {
  const pathname = usePathname();
  const currentItem =
    NAV_ITEMS.find((item) =>
      item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href),
    ) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-[248px] shrink-0 border-r bg-card lg:flex lg:flex-col">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              O
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">OutreachOS</p>
              <p className="truncate text-xs text-muted-foreground">SmartFusion ops</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/inbox" && unreadInbox > 0 ? (
                    <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">
                      {unreadInbox > 99 ? "99+" : unreadInbox}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-3">
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-background text-xs font-semibold">
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{userName}</p>
                <Badge variant="secondary" className="mt-1 h-5 rounded px-1.5 text-[10px]">
                  {userRole}
                </Badge>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {eyebrow ?? currentItem.eyebrow}
              </p>
              <h1 className="truncate text-base font-semibold">
                {headline ?? currentItem.headline}
              </h1>
            </div>
            <div className="hidden h-9 w-[280px] items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground md:flex">
              <Search className="size-4" />
              Search leads, campaigns...
            </div>
            <Separator orientation="vertical" className="hidden h-6 md:block" />
            <Badge variant="outline" className="hidden h-7 rounded-md md:inline-flex">
              SMTP + Postgres
            </Badge>
          </header>

          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
