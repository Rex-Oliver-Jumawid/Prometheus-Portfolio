"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/features/auth/actions";
import type { CurrentUser } from "@/features/auth/queries";
import { profileSchema, type ProfileInput } from "@/features/auth/schemas";

export function ProfileForm({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName },
  });

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      setSuccess(undefined);
      const result = await updateProfileAction(values);
      if (result.status === "error") {
        setError("root", { message: result.message });
        return;
      }
      setSuccess(result.message);
      router.refresh();
    });
  });

  return (
    <form
      method="post"
      onSubmit={submit}
      className="max-w-xl space-y-5"
      noValidate
    >
      {errors.root?.message ? (
        <FormMessage status="error">{errors.root.message}</FormMessage>
      ) : null}
      {success ? <FormMessage status="success">{success}</FormMessage> : null}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
        {errors.fullName ? (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="profileEmail">Email address</Label>
        <Input id="profileEmail" value={user.email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Email changes should be enabled only after the project’s confirmation
          policy is configured.
        </p>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
