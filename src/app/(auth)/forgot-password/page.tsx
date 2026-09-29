import type { Metadata } from "next";

import { AuthFrame } from "@/features/auth/components/auth-frame";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      title="Reset your password"
      description="Enter your email address and we’ll send a secure reset link if the account exists."
    >
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
