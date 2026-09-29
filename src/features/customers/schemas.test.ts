import { describe, expect, it } from "vitest";

import {
  customerFormSchema,
  customerListQuerySchema,
} from "@/features/customers/schemas";

describe("customer validation", () => {
  it("accepts and normalizes a valid customer form", () => {
    expect(
      customerFormSchema.parse({
        name: "  Northstar Supplies  ",
        email: "orders@northstar.example",
        phone: "  +1 555 0100  ",
        status: "active",
        notes: "  Priority account  ",
        organizationId: "",
      }),
    ).toEqual({
      name: "Northstar Supplies",
      email: "orders@northstar.example",
      phone: "+1 555 0100",
      status: "active",
      notes: "Priority account",
      organizationId: "",
    });
  });

  it("rejects invalid contact data", () => {
    expect(
      customerFormSchema.safeParse({
        name: "",
        email: "not-an-email",
        phone: "",
        status: "unknown",
        notes: "",
        organizationId: "",
      }).success,
    ).toBe(false);
  });
});

describe("customer list query", () => {
  it("coerces supported URL values", () => {
    expect(
      customerListQuerySchema.parse({
        page: "2",
        pageSize: "20",
        search: "  north  ",
        status: "active",
        sort: "name",
        direction: "asc",
      }),
    ).toEqual({
      page: 2,
      pageSize: 20,
      search: "north",
      status: "active",
      sort: "name",
      direction: "asc",
    });
  });

  it("falls back safely for unsupported URL values", () => {
    expect(
      customerListQuerySchema.parse({
        page: "-1",
        pageSize: "999",
        sort: "sql",
      }),
    ).toMatchObject({ page: 1, pageSize: 10, sort: "created_at" });
  });
});
