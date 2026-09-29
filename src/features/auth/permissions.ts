export const permissions = {
  dashboardView: "dashboard:view",
  customersRead: "customers:read",
  customersWrite: "customers:write",
  customersDelete: "customers:delete",
  filesRead: "files:read",
  filesWrite: "files:write",
  filesDelete: "files:delete",
  auditRead: "audit:read",
  membersManage: "members:manage",
  settingsManage: "settings:manage",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];
export type AppRole = "admin" | "manager" | "staff";

const rolePermissions: Record<AppRole, ReadonlySet<Permission> | "all"> = {
  admin: "all",
  manager: new Set([
    permissions.dashboardView,
    permissions.customersRead,
    permissions.customersWrite,
    permissions.customersDelete,
    permissions.filesRead,
    permissions.filesWrite,
    permissions.filesDelete,
    permissions.auditRead,
  ]),
  staff: new Set([
    permissions.dashboardView,
    permissions.customersRead,
    permissions.filesRead,
    permissions.filesWrite,
    permissions.filesDelete,
  ]),
};

export function hasPermission(role: AppRole, permission: Permission) {
  const allowed = rolePermissions[role];
  return allowed === "all" || allowed.has(permission);
}
