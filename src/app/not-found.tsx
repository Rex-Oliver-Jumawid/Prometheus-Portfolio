import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl items-center px-6">
      <EmptyState
        icon={<SearchX />}
        title="Page not found"
        description="The page may have moved or the address may be incorrect."
        action={
          <Link href="/dashboard" className={buttonVariants()}>
            Go to dashboard
          </Link>
        }
      />
    </main>
  );
}
