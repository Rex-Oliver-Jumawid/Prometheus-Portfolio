import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { requireCurrentUser } from "@/features/auth/queries";
import { CustomerTable } from "@/features/customers/components/customer-table";
import { listCustomers } from "@/features/customers/queries";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, user] = await Promise.all([
    searchParams,
    requireCurrentUser(),
  ]);
  const result = await listCustomers(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 p-5 sm:p-7 lg:p-10">
      <PageHeader
        eyebrow="Reference feature"
        title="Customers"
        description="Search, filter, and maintain customer records. Mutations are validated, authorized, revalidated, and audited."
      />
      <CustomerTable result={result} role={user.role} />
    </div>
  );
}
