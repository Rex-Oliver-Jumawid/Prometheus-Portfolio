import "server-only";

import { z } from "zod";

import { AuthorizationError } from "@/features/auth/authorization";
import type { AppRole } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

const organizationIdSchema = z.uuid();

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  role: AppRole;
}

export async function requireOrganizationContext(
  input: unknown,
): Promise<OrganizationContext> {
  const organizationId = organizationIdSchema.parse(input);
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError();

  const supabase = await createClient();
  const [{ data: organization }, { data: membership }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!organization || (user.role !== "admin" && !membership)) {
    throw new AuthorizationError();
  }

  return {
    ...organization,
    role: user.role === "admin" ? "admin" : membership!.role,
  };
}
