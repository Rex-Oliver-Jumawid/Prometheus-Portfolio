# Creating a feature

Use `src/features/customers` as the canonical reference. Copy its shape and replace the business terms; do not create a generic repository/service layer first.

## 1. Model the data

Create a migration with the Supabase CLI. Add the table, constraints, foreign keys, timestamps, policy indexes, explicit grants, RLS, and meaningful audit trigger. Decide whether data is global or organization-owned before choosing nullability.

Reset locally, run database tests/advisors, and regenerate `src/types/database.generated.ts`.

## 2. Build the feature boundary

Typical structure:

```text
src/features/suppliers/
  actions.ts
  queries.ts
  schemas.ts
  schemas.test.ts
  types.ts
  components/
    supplier-form-dialog.tsx
    supplier-table.tsx
```

- `schemas.ts`: Zod definitions for every form, identifier, URL filter, and external payload.
- `queries.ts`: server-only, authorized, typed reads; pagination/filter/sort are allowlisted.
- `actions.ts`: `"use server"`, repeat Zod validation, call `requirePermission()`, mutate through the request-scoped server client, return `ActionResult`, and revalidate affected routes.
- `types.ts`: aliases from generated database types.
- Components render state and delegate operations; they contain no database or permission decisions.

## 3. Use the canonical UI patterns

- React Hook Form with `zodResolver` for interactive forms.
- The same Zod schema in the Server Action because browser validation is bypassable.
- shadcn-style primitives from `src/components/ui` and shared `FormMessage`.
- `AppDataTable` for server-driven pagination/sorting, with feature-owned search/filter controls in its toolbar.
- `ConfirmationDialog` for destructive actions.
- `PermissionGuard` only to hide controls already protected on the server.
- Route `loading.tsx`, `error.tsx`, empty content, and not-found behavior as needed.

## 4. Verify the feature

Add tests for validation, permission behavior, and important domain rules. Add pgTAP cases for allowed and denied RLS writes; a zero-row denied update/delete must be paired with an assertion that the row is unchanged.

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:reset
pnpm db:test
```

Add a small Playwright journey only for a critical workflow whose integration value exceeds its maintenance cost.
