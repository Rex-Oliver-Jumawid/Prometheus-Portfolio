import "server-only";

import { permissions } from "@/features/auth/permissions";
import { requirePermission } from "@/features/auth/authorization";
import {
  customerListQuerySchema,
  type CustomerListQuery,
} from "@/features/customers/schemas";
import type { Customer } from "@/features/customers/types";
import { createClient } from "@/lib/supabase/server";

export interface CustomerListResult {
  customers: Customer[];
  query: CustomerListQuery;
  totalRows: number;
  pageCount: number;
}

export function parseCustomerListQuery(input: unknown) {
  return customerListQuerySchema.parse(input);
}

export async function listCustomers(
  input: unknown,
  organizationId: string | null = null,
): Promise<CustomerListResult> {
  const query = parseCustomerListQuery(input);
  await requirePermission(permissions.customersRead, organizationId);
  const supabase = await createClient();

  let request = supabase.from("customers").select("*", { count: "exact" });
  request = organizationId
    ? request.eq("organization_id", organizationId)
    : request.is("organization_id", null);

  if (query.search) request = request.ilike("name", `%${query.search}%`);
  if (query.status !== "all") request = request.eq("status", query.status);

  const start = (query.page - 1) * query.pageSize;
  const { data, count, error } = await request
    .order(query.sort, { ascending: query.direction === "asc" })
    .range(start, start + query.pageSize - 1);

  if (error) throw new Error("Customers could not be loaded.");

  const totalRows = count ?? 0;
  return {
    customers: data,
    query,
    totalRows,
    pageCount: Math.ceil(totalRows / query.pageSize),
  };
}

export async function getCustomerSummary(organizationId: string | null = null) {
  await requirePermission(permissions.customersRead, organizationId);
  const supabase = await createClient();

  function countByStatus(status?: Customer["status"]) {
    let request = supabase
      .from("customers")
      .select("id", { count: "exact", head: true });
    request = organizationId
      ? request.eq("organization_id", organizationId)
      : request.is("organization_id", null);
    return status ? request.eq("status", status) : request;
  }

  const [total, active, leads, inactive] = await Promise.all([
    countByStatus(),
    countByStatus("active"),
    countByStatus("lead"),
    countByStatus("inactive"),
  ]);

  if (total.error || active.error || leads.error || inactive.error) {
    throw new Error("Customer summary could not be loaded.");
  }

  return {
    total: total.count ?? 0,
    active: active.count ?? 0,
    leads: leads.count ?? 0,
    inactive: inactive.count ?? 0,
  };
}

export async function getRecentCustomers(
  organizationId: string | null = null,
): Promise<Customer[]> {
  await requirePermission(permissions.customersRead, organizationId);
  const supabase = await createClient();
  let request = supabase.from("customers").select("*");
  request = organizationId
    ? request.eq("organization_id", organizationId)
    : request.is("organization_id", null);

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error("Recent customers could not be loaded.");
  return data;
}
