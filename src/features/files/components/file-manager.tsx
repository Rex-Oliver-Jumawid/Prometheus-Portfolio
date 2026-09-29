"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteFileAction, uploadFileAction } from "@/features/files/actions";
import type { FileListItem } from "@/features/files/types";
import { fileUploadSchema } from "@/features/files/schemas";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileManager({ files }: { files: FileListItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    status: "success" | "error";
    text: string;
  }>();

  return (
    <div className="space-y-5">
      <form
        ref={formRef}
        method="post"
        encType="multipart/form-data"
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const parsed = fileUploadSchema.safeParse({
            file: formData.get("file"),
            organizationId: formData.get("organizationId"),
          });
          if (!parsed.success) {
            setMessage({
              status: "error",
              text: parsed.error.issues[0].message,
            });
            return;
          }
          startTransition(async () => {
            try {
              const result = await uploadFileAction(formData);
              setMessage({ status: result.status, text: result.message });
              if (result.status === "success") {
                formRef.current?.reset();
                router.refresh();
              }
            } catch {
              setMessage({
                status: "error",
                text: "Upload failed. Check your connection and try again.",
              });
            }
          });
        }}
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor="file">Attachment</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,application/pdf,text/plain"
            required
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG, PDF, or text; maximum 4 MB.
          </p>
        </div>
        <input type="hidden" name="organizationId" value="" />
        <Button type="submit" disabled={isPending}>
          <Upload /> {isPending ? "Uploading…" : "Upload"}
        </Button>
      </form>

      {message ? (
        <FormMessage status={message.status}>{message.text}</FormMessage>
      ) : null}

      {files.length ? (
        <div className="grid gap-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg bg-muted/35 px-3 py-3 transition-colors hover:bg-muted/60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                {file.downloadUrl ? (
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {file.original_name}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium">
                    {file.original_name}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(file.size_bytes)} ·{" "}
                  {dateFormatter.format(new Date(file.created_at))}
                </p>
              </div>
              <ConfirmationDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${file.original_name}`}
                  >
                    <Trash2 />
                  </Button>
                }
                title={`Delete ${file.original_name}?`}
                description="The stored object and its metadata will be removed permanently."
                confirmLabel="Delete file"
                onConfirm={async () => {
                  const result = await deleteFileAction(file.id);
                  setMessage({ status: result.status, text: result.message });
                  if (result.status === "error") return false;
                  router.refresh();
                  return true;
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
          No files uploaded yet.
        </p>
      )}
    </div>
  );
}
