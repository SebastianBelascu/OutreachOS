import { redirect } from "next/navigation";
import { connection } from "next/server";

import { InternalAppShell } from "@/components/internal/app-shell";
import { requireAppUser } from "@/lib/outreach/auth";
import { unreadInboxCount } from "@/lib/outreach/inbox";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const appUser = await requireAppUser();

  if (!appUser) {
    redirect("/auth/login");
  }

  const unreadInbox = await unreadInboxCount().catch(() => 0);

  return (
    <InternalAppShell
      userName={appUser.fullName ?? appUser.email}
      userRole={appUser.role}
      unreadInbox={unreadInbox}
    >
      {children}
    </InternalAppShell>
  );
}
