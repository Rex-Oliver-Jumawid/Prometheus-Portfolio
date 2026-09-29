import { z } from "zod";

export const FILE_BUCKET = "attachments";
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/plain",
] as const;

export const fileUploadSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, "Choose a file to upload.")
    .refine((file) => file.size > 0, "The selected file is empty.")
    .refine(
      (file) => file.size <= MAX_FILE_BYTES,
      "The file must be 4 MB or smaller.",
    )
    .refine(
      (file) => (ALLOWED_FILE_TYPES as readonly string[]).includes(file.type),
      "Upload a JPG, PNG, PDF, or plain-text file.",
    ),
  organizationId: z.union([z.literal(""), z.uuid()]).default(""),
});

export const fileIdSchema = z.uuid();
