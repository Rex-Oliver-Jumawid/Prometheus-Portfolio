import Link from "next/link";

import { AuthFrame } from "@/features/auth/components/auth-frame";
import { buttonVariants } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <AuthFrame
      title="That link did not work"
      description="The authentication link may have expired or already been used. Request a new link and try again."
    >
      <Link
        className={buttonVariants({ className: "w-full" })}
        href="/forgot-password"
      >
        Request a new link
      </Link>
    </AuthFrame>
  );
}
