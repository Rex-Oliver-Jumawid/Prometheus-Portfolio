import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/authorization", () => ({
  requirePermission: vi.fn(),
  AuthorizationError: class extends Error {},
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { revalidatePath } from "next/cache";
import {
  requirePermission,
  AuthorizationError,
} from "@/features/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { createCustomerAction } from "./actions";

const input = {
  name: "Customer",
  email: "",
  phone: "",
  notes: "",
  status: "lead",
};

describe("customer action boundary", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects invalid input before authorization or database access", async () => {
    expect((await createCustomerAction({ ...input, name: "" })).status).toBe(
      "error",
    );
    expect(requirePermission).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not mutate or revalidate when server authorization denies the caller", async () => {
    vi.mocked(requirePermission).mockRejectedValue(new AuthorizationError());
    expect((await createCustomerAction(input)).status).toBe("error");
    expect(createClient).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a safe failure and does not revalidate after a database rejection", async () => {
    vi.mocked(requirePermission).mockResolvedValue({
      id: "user",
      email: "",
      fullName: "User",
      role: "manager",
      avatarPath: null,
    });
    const chain = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi
        .fn()
        .mockResolvedValue({
          data: null,
          error: { message: "private database details" },
        }),
    };
    chain.insert.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    vi.mocked(createClient).mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    const result = await createCustomerAction(input);
    expect(result.status).toBe("error");
    expect(result.message).not.toContain("private database details");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
