"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactElement } from "react";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/features/customers/actions";
import {
  customerFormSchema,
  type CustomerFormInput,
} from "@/features/customers/schemas";
import type { Customer } from "@/features/customers/types";

interface CustomerFormDialogProps {
  trigger: ReactElement;
  customer?: Customer;
}

export function CustomerFormDialog({
  trigger,
  customer,
}: CustomerFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerFormInput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      status: customer?.status ?? "lead",
      notes: customer?.notes ?? "",
      organizationId: customer?.organization_id ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = customer
        ? await updateCustomerAction({ ...values, id: customer.id })
        : await createCustomerAction(values);

      if (result.status === "error") {
        setError("root", { message: result.message });
        return;
      }

      setOpen(false);
      if (!customer) reset();
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {customer ? "Edit customer" : "Add customer"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {customer
              ? "Update the customer’s contact and account details."
              : "Create a customer record for your team to manage."}
          </DialogDescription>
        </DialogHeader>

        <form method="post" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {errors.root?.message ? (
              <FormMessage status="error" className="sm:col-span-2">
                {errors.root.message}
              </FormMessage>
            ) : null}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${customer?.id ?? "new"}-name`}>Name</Label>
              <Input
                id={`${customer?.id ?? "new"}-name`}
                autoFocus
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${customer?.id ?? "new"}-email`}>Email</Label>
              <Input
                id={`${customer?.id ?? "new"}-email`}
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${customer?.id ?? "new"}-phone`}>Phone</Label>
              <Input
                id={`${customer?.id ?? "new"}-phone`}
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
              {errors.phone ? (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${customer?.id ?? "new"}-status`}>Status</Label>
              <Select
                id={`${customer?.id ?? "new"}-status`}
                aria-invalid={Boolean(errors.status)}
                {...register("status")}
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${customer?.id ?? "new"}-notes`}>Notes</Label>
              <Textarea
                id={`${customer?.id ?? "new"}-notes`}
                aria-invalid={Boolean(errors.notes)}
                {...register("notes")}
              />
              {errors.notes ? (
                <p className="text-xs text-destructive">
                  {errors.notes.message}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending} />
              }
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving…"
                : customer
                  ? "Save changes"
                  : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
