"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/features/auth/actions";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await loginAction(values);
      if (result.status === "error") {
        setError("root", { message: result.message });
        return;
      }
      router.replace(nextPath);
      router.refresh();
    });
  });

  return (
    <form method="post" onSubmit={submit} className="space-y-6" noValidate>
      {errors.root?.message ? (
        <FormMessage status="error">{errors.root.message}</FormMessage>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          autoFocus
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button className="h-10 w-full" type="submit" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        Accounts are provided by your administrator.
      </p>
    </form>
  );
}
