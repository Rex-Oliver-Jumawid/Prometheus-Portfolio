import { describe, expect, it } from "vitest";

import { fileUploadSchema, MAX_FILE_BYTES } from "@/features/files/schemas";

describe("file upload validation", () => {
  it("accepts an allowed non-empty file", () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    expect(
      fileUploadSchema.safeParse({ file, organizationId: "" }).success,
    ).toBe(true);
  });

  it("rejects unsupported and oversized files", () => {
    const executable = new File(["x"], "tool.exe", {
      type: "application/octet-stream",
    });
    const oversized = new File(
      [new Uint8Array(MAX_FILE_BYTES + 1)],
      "large.pdf",
      {
        type: "application/pdf",
      },
    );

    expect(fileUploadSchema.safeParse({ file: executable }).success).toBe(
      false,
    );
    expect(fileUploadSchema.safeParse({ file: oversized }).success).toBe(false);
  });

  it("accepts the supported maximum and rejects missing files and malformed scope", () => {
    const file = new File([new Uint8Array(MAX_FILE_BYTES)], "limit.pdf", {
      type: "application/pdf",
    });
    expect(fileUploadSchema.safeParse({ file }).success).toBe(true);
    expect(fileUploadSchema.safeParse({ file: null }).success).toBe(false);
    expect(
      fileUploadSchema.safeParse({ file, organizationId: "not-a-uuid" })
        .success,
    ).toBe(false);
  });
});
