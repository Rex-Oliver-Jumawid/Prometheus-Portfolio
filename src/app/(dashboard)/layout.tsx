import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";
import { requireCurrentUser } from "@/features/auth/queries";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
