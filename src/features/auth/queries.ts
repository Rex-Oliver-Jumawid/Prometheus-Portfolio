import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { AppRole } from "@/features/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  avatarPath: string | null;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims.sub;
  if (claimsError || !userId) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) return null;

  return {
    id: userId,
    email:
      typeof claimsData.claims.email === "string"
        ? claimsData.claims.email
        : "",
    fullName: profile.full_name,
    role: profile.role,
    avatarPath: profile.avatar_path,
  };
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
