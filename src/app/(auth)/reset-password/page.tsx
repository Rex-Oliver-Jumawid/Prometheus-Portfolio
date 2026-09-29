import type { Metadata } from "next";

import { AuthFrame } from "@/features/auth/components/auth-frame";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthFrame
      title="Choose a new password"
      description="Use at least eight characters and keep this password unique to this application."
    >
      <ResetPasswordForm />
    </AuthFrame>
  );
}
