# Permissions

RBAC intentionally has three roles: `admin`, `manager`, and `staff`.

| Permission                | Admin | Manager | Staff |
| ------------------------- | ----- | ------- | ----- |
| `dashboard:view`          | Yes   | Yes     | Yes   |
| `customers:read`          | Yes   | Yes     | Yes   |
| `customers:write`         | Yes   | Yes     | No    |
| `customers:delete`        | Yes   | Yes     | No    |
| `files:read/write/delete` | Yes   | Yes     | Yes   |
| `audit:read`              | Yes   | Yes     | No    |
| `members:manage`          | Yes   | No      | No    |
| `settings:manage`         | Yes   | No      | No    |

The TypeScript matrix lives in `src/features/auth/permissions.ts`. Its database equivalent is `private.role_has_permission()` in the foundation migration. Update both together and add TypeScript plus pgTAP assertions whenever the matrix changes.

## Server convention

Every protected query or mutation calls:

```ts
await requirePermission(permissions.customersWrite, organizationId);
```

With no organization ID, the global profile role applies. With an organization ID, only global admins or a matching membership role applies. RLS repeats the actual data boundary, so bypassing the UI or invoking a Server Action directly does not grant access.

`requirePermission()` is centralized in `src/features/auth/authorization.ts`. It returns the verified current user when allowed and throws a safe `AuthorizationError` otherwise.

## UI convention

`PermissionGuard` may hide an unavailable button:

```tsx
<PermissionGuard role={user.role} permission={permissions.customersWrite}>
  <AddCustomerButton />
</PermissionGuard>
```

This is a usability convenience only. Never use it as the only authorization check.

Do not add hierarchical roles, per-record ACLs, policy languages, or JWT `user_metadata` authorization. Add a concrete permission to the small matrix when a real business operation needs it.
