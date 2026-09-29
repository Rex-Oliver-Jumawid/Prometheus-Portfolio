"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";
import { getCurrentUser } from "@/features/auth/queries";
import {
  actionError,
  actionSuccess,
  validationError,
  type ActionResult,
} from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/config/env";

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return actionError("Email or password is incorrect.");
  return actionSuccess("Signed in.", undefined);
}

export async function forgotPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  return actionSuccess(
    "If an account exists for that email, a reset link is on its way.",
    undefined,
  );
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error?.code === "same_password") {
    return actionError(
      "Choose a password different from your current password.",
    );
  }
  if (error) return actionError("The reset link is invalid or has expired.");
  return actionSuccess(
    "Password updated. You can continue to the dashboard.",
    undefined,
  );
}

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const user = await getCurrentUser();
  if (!user) return actionError("Your session has expired. Sign in again.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);

  if (error) return actionError("Profile changes could not be saved.");
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  return actionSuccess("Profile updated.", undefined);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
