import "server-only";

import { requirePermission } from "@/features/auth/authorization";
import { permissions } from "@/features/auth/permissions";
import { FILE_BUCKET } from "@/features/files/schemas";
import type { FileListItem } from "@/features/files/types";
import { createClient } from "@/lib/supabase/server";

export async function listFiles(
  organizationId: string | null = null,
): Promise<FileListItem[]> {
  const user = await requirePermission(permissions.filesRead, organizationId);
  const supabase = await createClient();
  let request = supabase.from("file_records").select("*");
  request = organizationId
    ? request.eq("organization_id", organizationId)
    : request.is("organization_id", null).eq("uploaded_by", user.id);

  const { data, error } = await request.order("created_at", {
    ascending: false,
  });
  if (error) throw new Error("Files could not be loaded.");

  return Promise.all(
    data.map(async (record) => {
      const { data: signed } = await supabase.storage
        .from(FILE_BUCKET)
        .createSignedUrl(record.object_path, 300);
      return { ...record, downloadUrl: signed?.signedUrl ?? null };
    }),
  );
}
