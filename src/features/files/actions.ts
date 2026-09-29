"use server";

import { revalidatePath } from "next/cache";

import {
  AuthorizationError,
  requirePermission,
} from "@/features/auth/authorization";
import { permissions } from "@/features/auth/permissions";
import {
  FILE_BUCKET,
  fileIdSchema,
  fileUploadSchema,
} from "@/features/files/schemas";
import {
  actionError,
  actionSuccess,
  validationError,
  type ActionResult,
} from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";

function safeFilename(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-100);
  return normalized || "upload";
}

function safeFileError(error: unknown, fallback: string) {
  return actionError(
    error instanceof AuthorizationError ? error.message : fallback,
  );
}

function revalidateFiles() {
  revalidatePath("/settings/profile");
}

export async function uploadFileAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = fileUploadSchema.safeParse({
    file: formData.get("file"),
    organizationId: formData.get("organizationId") ?? "",
  });
  if (!parsed.success) return validationError(parsed.error);

  const organizationId = parsed.data.organizationId || null;
  try {
    const user = await requirePermission(
      permissions.filesWrite,
      organizationId,
    );
    const supabase = await createClient();
    const prefix = organizationId
      ? `organizations/${organizationId}`
      : `users/${user.id}`;
    const objectPath = `${prefix}/${crypto.randomUUID()}-${safeFilename(parsed.data.file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(objectPath, parsed.data.file, {
        contentType: parsed.data.file.type,
        upsert: false,
      });
    if (uploadError) return actionError("The file could not be uploaded.");

    const { data, error: metadataError } = await supabase
      .from("file_records")
      .insert({
        organization_id: organizationId,
        bucket_id: FILE_BUCKET,
        object_path: objectPath,
        original_name: parsed.data.file.name,
        mime_type: parsed.data.file.type,
        size_bytes: parsed.data.file.size,
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (metadataError) {
      await supabase.storage.from(FILE_BUCKET).remove([objectPath]);
      return actionError("The file metadata could not be saved.");
    }

    revalidateFiles();
    return actionSuccess("File uploaded.", data);
  } catch (error) {
    return safeFileError(error, "The file could not be uploaded.");
  }
}

export async function deleteFileAction(input: unknown): Promise<ActionResult> {
  const parsed = fileIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createClient();
    const { data: record, error: lookupError } = await supabase
      .from("file_records")
      .select("object_path, organization_id")
      .eq("id", parsed.data)
      .maybeSingle();
    if (lookupError || !record) return actionError("File not found.");

    await requirePermission(permissions.filesDelete, record.organization_id);
    const { error: storageError } = await supabase.storage
      .from(FILE_BUCKET)
      .remove([record.object_path]);
    if (storageError)
      return actionError("The stored file could not be deleted.");

    const { error: metadataError } = await supabase
      .from("file_records")
      .delete()
      .eq("id", parsed.data);
    if (metadataError)
      return actionError("The file record could not be deleted.");

    revalidateFiles();
    return actionSuccess("File deleted.", undefined);
  } catch (error) {
    return safeFileError(error, "The file could not be deleted.");
  }
}
