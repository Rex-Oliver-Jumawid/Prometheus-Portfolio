import type { Metadata } from "next";

import { AuthFrame } from "@/features/auth/components/auth-frame";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeRedirectPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;

  return (
    <AuthFrame
      title="Welcome back"
      description="Sign in with the account your administrator provided."
    >
      <LoginForm nextPath={safeRedirectPath(params.next ?? null)} />
    </AuthFrame>
  );
}
