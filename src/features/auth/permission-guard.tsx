import type { ReactNode } from "react";

import {
  hasPermission,
  type AppRole,
  type Permission,
} from "@/features/auth/permissions";

interface PermissionGuardProps {
  role: AppRole;
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  role,
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  return hasPermission(role, permission) ? children : fallback;
}
