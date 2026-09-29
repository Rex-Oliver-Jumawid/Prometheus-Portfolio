import "server-only";

import {
  hasPermission,
  type AppRole,
  type Permission,
} from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

export class AuthorizationError extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
    this.name = "AuthorizationError";
  }
}

export async function requirePermission(
  permission: Permission,
  organizationId?: string | null,
) {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError();

  let effectiveRole: AppRole = user.role;

  if (organizationId && user.role !== "admin") {
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) throw new AuthorizationError();
    effectiveRole = membership.role;
  }

  if (!hasPermission(effectiveRole, permission)) {
    throw new AuthorizationError();
  }

  return user;
}
