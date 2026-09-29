# Application coding conventions

- Read `docs/business-context.md` and the relevant `docs/features/<feature>.md` before client feature work. Use `docs/feature-spec.md` for new specifications; resolve access and ownership decisions first.

- Put product capabilities under `src/features/<feature>`; keep routes focused on routing, data loading, and composition.
- Keep business and authorization logic out of React components.
- Prefer Server Components. Add `"use client"` only for browser state, events, or client-only libraries.
- Reuse existing feature and shared primitives before creating another abstraction or component.
- Keep the application a modular monolith; do not add service boundaries without a measured need.

## Data and security

- Represent every schema, function, trigger, grant, and RLS change in a checked-in Supabase migration.
- Create migrations with `pnpm exec supabase migration new <name>` and regenerate `src/types/database.generated.ts` after schema changes.
- Enable RLS on every exposed table and add indexes for policy filter columns.
- Validate all user input, URL state, file data, and external data with Zod.
- Authenticate and authorize protected operations on the server with the canonical `requirePermission()` pattern.
- `PermissionGuard` controls UI visibility only; it never replaces server authorization or RLS.
- Never expose secret/service-role keys or authorize from user-editable auth metadata.
- Audit important creates, updates, deletes, role/permission changes, approvals, and sensitive exports; do not audit cosmetic UI events.

## Canonical patterns

- Copy `src/features/customers` for database-backed CRUD features.
- Use `AppDataTable` for standard searchable, sortable, paginated tables.
- Use React Hook Form plus `zodResolver`, while repeating validation inside the Server Action.
- Return the shared `ActionResult` shape from Server Actions; expose safe messages and log no secrets.
- Revalidate every affected route after a successful mutation.
- Keep tenant scope explicit and optional. Use `organization_id`, organization context, scoped permission checks, and RLS only for tenant-owned data.
- Add tests for permission matrices, validation, and important domain behavior. Add pgTAP coverage when changing RLS.

Before completion, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. For database changes also run `pnpm db:reset`, `pnpm db:types`, `pnpm db:test`, and local database advisors.
