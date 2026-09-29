import { ArrowRight, UsersRound } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCurrentUser } from "@/features/auth/queries";
import {
  getCustomerSummary,
  getRecentCustomers,
} from "@/features/customers/queries";

const statusVariant = {
  active: "success",
  lead: "warning",
  inactive: "muted",
} as const;

export default async function DashboardPage() {
  const [user, summary, recent] = await Promise.all([
    requireCurrentUser(),
    getCustomerSummary(),
    getRecentCustomers(),
  ]);

  const metrics = [
    ["Total customers", summary.total],
    ["Active", summary.active],
    ["Open leads", summary.leads],
    ["Inactive", summary.inactive],
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 p-5 sm:p-7 lg:p-10">
      <PageHeader
        eyebrow="Overview"
        title={`Good day, ${user.fullName.split(" ")[0]}.`}
        description="A quick view of the reference customer workflow and its current records."
        action={
          <Link href="/customers" className={buttonVariants()}>
            Manage customers <ArrowRight />
          </Link>
        }
      />

      <Card role="region" aria-labelledby="customer-summary-title">
        <CardHeader>
          <CardTitle id="customer-summary-title" className="text-base">
            Customer summary
          </CardTitle>
          <CardDescription>
            Current status across all customer records.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted/60 p-4">
              <p className="text-2xl font-semibold tracking-[-0.035em]">
                {value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card role="region" aria-labelledby="recent-customers-title">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle id="recent-customers-title" className="text-base">
              Recently added
            </CardTitle>
            <CardDescription>
              The latest customer records in this workspace.
            </CardDescription>
          </div>
          <Link
            href="/customers"
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>

        <CardContent className="pt-4">
          {recent.length ? (
            <div className="grid gap-1">
              {recent.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {customer.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {customer.email ?? "No email address"}
                    </p>
                  </div>
                  <Badge
                    variant={statusVariant[customer.status]}
                    className="capitalize"
                  >
                    {customer.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<UsersRound />}
              title="No customers yet"
              description="Add your first customer to populate this workspace."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
