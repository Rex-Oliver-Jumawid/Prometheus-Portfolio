import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/config/env";

describe("parsePublicEnv", () => {
  it("accepts a valid Supabase public configuration", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toEqual({
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });
  });

  it("rejects missing or invalid values without exposing them", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      }),
    ).toThrow("Missing or invalid public Supabase environment variables.");
  });
});
