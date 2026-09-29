"use client";

import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AppDataTable } from "@/components/shared/app-data-table";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { FormMessage } from "@/components/shared/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PermissionGuard } from "@/features/auth/permission-guard";
import { permissions, type AppRole } from "@/features/auth/permissions";
import { deleteCustomerAction } from "@/features/customers/actions";
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog";
import type { CustomerListResult } from "@/features/customers/queries";
import type { Customer } from "@/features/customers/types";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

const statusVariant = {
  active: "success",
  lead: "warning",
  inactive: "muted",
} as const;

export function CustomerTable({
  result,
  role,
}: {
  result: CustomerListResult;
  role: AppRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(result.query.search);
  const [message, setMessage] = useState<{
    status: "success" | "error";
    text: string;
  }>();

  function updateQuery(updates: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.replace(`${pathname}?${params.toString()}`);
  }

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.original.email ?? "No email address"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={statusVariant[row.original.status]}
            className="capitalize"
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        enableSorting: false,
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        accessorKey: "created_at",
        header: "Added",
        cell: ({ row }) =>
          dateFormatter.format(new Date(row.original.created_at)),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <PermissionGuard
              role={role}
              permission={permissions.customersWrite}
            >
              <CustomerFormDialog
                customer={row.original}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${row.original.name}`}
                  >
                    <Pencil />
                  </Button>
                }
              />
            </PermissionGuard>
            <PermissionGuard
              role={role}
              permission={permissions.customersDelete}
            >
              <ConfirmationDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${row.original.name}`}
                  >
                    <Trash2 />
                  </Button>
                }
                title={`Delete ${row.original.name}?`}
                description="This permanently removes the customer record and creates an audit event."
                confirmLabel="Delete customer"
                onConfirm={async () => {
                  const response = await deleteCustomerAction(row.original.id);
                  setMessage({
                    status: response.status,
                    text: response.message,
                  });
                  if (response.status === "error") return false;
                  router.refresh();
                  return true;
                }}
              />
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [role, router],
  );

  const sorting: SortingState = [
    { id: result.query.sort, desc: result.query.direction === "desc" },
  ];

  const toolbar = (
    <div className="space-y-3">
      {message ? (
        <FormMessage status={message.status}>{message.text}</FormMessage>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          method="get"
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            updateQuery({ search, page: 1 });
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search customers"
            className="pl-9"
            placeholder="Search by customer name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </form>
        <Select
          aria-label="Filter by status"
          className="sm:w-40"
          value={result.query.status}
          onChange={(event) =>
            updateQuery({ status: event.target.value, page: 1 })
          }
        >
          <option value="all">All statuses</option>
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <PermissionGuard role={role} permission={permissions.customersWrite}>
          <CustomerFormDialog
            trigger={
              <Button>
                <Plus /> Add customer
              </Button>
            }
          />
        </PermissionGuard>
      </div>
    </div>
  );

  return (
    <AppDataTable
      columns={columns}
      data={result.customers}
      pageIndex={result.query.page - 1}
      pageSize={result.query.pageSize}
      pageCount={result.pageCount}
      totalRows={result.totalRows}
      sorting={sorting}
      toolbar={toolbar}
      emptyTitle={
        result.query.search || result.query.status !== "all"
          ? "No matching customers"
          : "No customers yet"
      }
      emptyDescription={
        result.query.search || result.query.status !== "all"
          ? "Try a different search or status filter."
          : "Add the first customer to begin using this reference feature."
      }
      onPageChange={(pageIndex) => updateQuery({ page: pageIndex + 1 })}
      onPageSizeChange={(pageSize) => updateQuery({ pageSize, page: 1 })}
      onSortingChange={(next) => {
        const sort = next[0];
        if (!sort) return;
        updateQuery({
          sort: sort.id,
          direction: sort.desc ? "desc" : "asc",
          page: 1,
        });
      }}
    />
  );
}
