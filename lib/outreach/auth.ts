import type { User } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function ensureAppUser(user: User) {
  return prisma.appUser.upsert({
    where: { id: user.id },
    update: {
      email: user.email ?? "",
      fullName:
        user.user_metadata.full_name ??
        user.user_metadata.name ??
        user.email?.split("@")[0] ??
        "Operator",
    },
    create: {
      id: user.id,
      email: user.email ?? "",
      fullName:
        user.user_metadata.full_name ??
        user.user_metadata.name ??
        user.email?.split("@")[0] ??
        "Operator",
      role: "ADMIN",
    },
  });
}

export async function requireAppUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return null;
  }

  return ensureAppUser(sessionUser);
}
