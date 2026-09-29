import "server-only";

import { z } from "zod";

import { requirePermission } from "@/features/auth/authorization";
import { permissions } from "@/features/auth/permissions";
import { createClient } from "@/lib/supabase/server";

const auditQuerySchema = z.object({
  entityType: z.string().trim().min(1).max(80),
  entityId: z.uuid(),
  organizationId: z.uuid().nullable().default(null),
  limit: z.number().int().min(1).max(100).default(25),
});

export async function listAuditEvents(input: unknown) {
  const query = auditQuerySchema.parse(input);
  await requirePermission(permissions.auditRead, query.organizationId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .eq("entity_type", query.entityType)
    .eq("entity_id", query.entityId)
    .order("occurred_at", { ascending: false })
    .limit(query.limit);

  if (error) throw new Error("Audit events could not be loaded.");
  return data;
}
