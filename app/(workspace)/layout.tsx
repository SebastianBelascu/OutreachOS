import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { connection } from "next/server";

import { InternalAppShell } from "@/components/internal/app-shell";
import { requireAppUser } from "@/lib/outreach/auth";

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

  const pathname = (await headers()).get("x-pathname") ?? "/dashboard";

  return (
    <InternalAppShell
      pathname={pathname}
      userName={appUser.fullName ?? appUser.email}
      userRole={appUser.role}
    >
      {children}
    </InternalAppShell>
  );
}
