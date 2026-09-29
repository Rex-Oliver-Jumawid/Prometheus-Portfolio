"use server";

import { revalidatePath } from "next/cache";

import {
  AuthorizationError,
  requirePermission,
} from "@/features/auth/authorization";
import { permissions } from "@/features/auth/permissions";
import {
  customerFormSchema,
  customerIdSchema,
  customerMutationSchema,
} from "@/features/customers/schemas";
import {
  actionError,
  actionSuccess,
  validationError,
  type ActionResult,
} from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";

function mutationValues(input: ReturnType<typeof customerFormSchema.parse>) {
  return {
    name: input.name,
    email: input.email ? input.email.toLowerCase() : null,
    phone: input.phone || null,
    status: input.status,
    notes: input.notes || null,
  };
}

function safeMutationError(error: unknown, fallback: string) {
  return actionError(
    error instanceof AuthorizationError ? error.message : fallback,
  );
}

function revalidateCustomerViews() {
  revalidatePath("/customers");
  revalidatePath("/dashboard");
}

export async function createCustomerAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const organizationId = parsed.data.organizationId || null;
    const user = await requirePermission(
      permissions.customersWrite,
      organizationId,
    );
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        ...mutationValues(parsed.data),
        organization_id: organizationId,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (error) return actionError("The customer could not be created.");
    revalidateCustomerViews();
    return actionSuccess("Customer created.", data);
  } catch (error) {
    return safeMutationError(error, "The customer could not be created.");
  }
}

export async function updateCustomerAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = customerMutationSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createClient();
    const { data: existing, error: lookupError } = await supabase
      .from("customers")
      .select("organization_id")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (lookupError || !existing) return actionError("Customer not found.");
    const user = await requirePermission(
      permissions.customersWrite,
      existing.organization_id,
    );
    const { data, error } = await supabase
      .from("customers")
      .update({
        ...mutationValues(parsed.data),
        updated_by: user.id,
      })
      .eq("id", parsed.data.id)
      .select("id")
      .single();

    if (error) return actionError("The customer could not be updated.");
    revalidateCustomerViews();
    return actionSuccess("Customer updated.", data);
  } catch (error) {
    return safeMutationError(error, "The customer could not be updated.");
  }
}

export async function deleteCustomerAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = customerIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createClient();
    const { data: existing, error: lookupError } = await supabase
      .from("customers")
      .select("organization_id")
      .eq("id", parsed.data)
      .maybeSingle();

    if (lookupError || !existing) return actionError("Customer not found.");
    await requirePermission(
      permissions.customersDelete,
      existing.organization_id,
    );
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", parsed.data);

    if (error) return actionError("The customer could not be deleted.");
    revalidateCustomerViews();
    return actionSuccess("Customer deleted.", undefined);
  } catch (error) {
    return safeMutationError(error, "The customer could not be deleted.");
  }
}
