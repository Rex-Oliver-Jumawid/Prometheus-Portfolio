"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/features/auth/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
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
          className={buttonVariants({
            variant: "outline",
            className: "w-full",
          })}
          href="/login"
        >
          Back to sign in
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
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>
      <Button className="h-10 w-full" type="submit" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Back to sign in
      </Link>
    </form>
  );
}
