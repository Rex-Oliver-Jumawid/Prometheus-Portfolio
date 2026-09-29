"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/features/auth/actions";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas";

export function ResetPasswordForm() {
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (result.status === "error") {
        setError("root", { message: result.message });
        return;
      }
      setMessage(result.message);
    });
  });

  if (message) {
    return (
      <div className="space-y-5">
        <FormMessage status="success">{message}</FormMessage>
        <Link
          className={buttonVariants({ className: "w-full" })}
          href="/dashboard"
        >
          Continue to dashboard
        </Link>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={submit} className="space-y-5" noValidate>
      {errors.root?.message ? (
        <FormMessage status="error">{errors.root.message}</FormMessage>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>
      <Button className="h-10 w-full" type="submit" disabled={isPending}>
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
