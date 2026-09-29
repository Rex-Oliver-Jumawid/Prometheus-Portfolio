import { describe, expect, it } from "vitest";

import {
  loginSchema,
  profileSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";

describe("authentication schemas", () => {
  it("requires a valid login email and a password", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse({
        email: "admin@example.test",
        password: "Starter123!",
      }).success,
    ).toBe(true);
  });

  it("requires matching reset passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "new-password",
      confirmPassword: "different-password",
    });
    expect(result.success).toBe(false);
  });

  it("trims profile names", () => {
    expect(profileSchema.parse({ fullName: "  Alex Admin  " })).toEqual({
      fullName: "Alex Admin",
    });
  });
});
