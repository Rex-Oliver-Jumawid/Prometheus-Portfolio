import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath", () => {
  it("allows local application paths", () => {
    expect(safeRedirectPath("/customers?page=2")).toBe("/customers?page=2");
    expect(safeRedirectPath("/settings/profile#files")).toBe(
      "/settings/profile#files",
    );
  });

  it("rejects redirects that can resolve outside the application origin", () => {
    expect(safeRedirectPath("https://attacker.test")).toBe("/dashboard");
    expect(safeRedirectPath("//attacker.test")).toBe("/dashboard");
    expect(safeRedirectPath("/\\attacker.test")).toBe("/dashboard");
    expect(safeRedirectPath("/customers\\history")).toBe("/dashboard");
  });

  it("rejects malformed and repeated query values", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(["/customers", "/dashboard"])).toBe("/dashboard");
    expect(safeRedirectPath("http://[")).toBe("/dashboard");
  });
});
