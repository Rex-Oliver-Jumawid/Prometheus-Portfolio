import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/queries", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { requirePermission, AuthorizationError } from "./authorization";
import { getCurrentUser } from "./queries";
import { permissions } from "./permissions";
import { createClient } from "@/lib/supabase/server";

const user = {
  id: "user",
  email: "user@example.test",
  fullName: "User",
  role: "manager" as const,
  avatarPath: null,
};

describe("server authorization boundary", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects anonymous callers before accessing membership data", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(
      requirePermission(permissions.customersRead),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects staff writes even when a caller bypasses UI controls", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...user, role: "staff" });
    await expect(
      requirePermission(permissions.customersWrite),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("requires organization membership despite a global manager role", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    vi.mocked(createClient).mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    await expect(
      requirePermission(permissions.customersWrite, "organization"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
