# Architecture

This repository is a modular monolith: one Next.js deployment and one Supabase/PostgreSQL project. That is the default until real load or organizational constraints justify something else.

## Dependency direction

```text
app routes and UI → feature application logic → feature/domain rules → Supabase/PostgreSQL
```

- `src/app` owns routes, layouts, metadata, route boundaries, and composition.
- `src/features/<feature>` owns validation, queries, Server Actions, business logic, tests, and feature UI.
- `src/components/ui` contains locally owned shadcn-style primitives.
- `src/components/shared` contains proven cross-feature patterns such as `AppDataTable`, states, page headers, and confirmation.
- `src/lib` contains framework/infrastructure adapters and safe cross-feature results.
- `src/config/app.ts` is the runtime branding source of truth.
- `src/types/database.generated.ts` is generated from the database and must not be hand-edited.

Server Components are the default. Client Components stay at interaction boundaries: forms, dialogs, the responsive shell, and TanStack Table. Protected data and mutation decisions stay server-side.

## Request flow

```text
Browser
  → Next proxy refreshes/verifies the Supabase cookie session
  → protected layout resolves the current profile
  → feature query calls requirePermission()
  → Supabase applies grants and RLS
  → Server Component renders typed data
```

Mutation flow:

```text
RHF form
  → Zod client validation
  → typed Server Action
  → Zod server validation
  → requirePermission()
  → Supabase mutation + RLS
  → database audit trigger
  → route revalidation
  → safe ActionResult
```

RLS is the final data boundary; `requirePermission()` produces clear server-side intent and useful failures. `PermissionGuard` only avoids showing unavailable controls.

## Deliberate limits

There is no repository layer, dependency injection container, global state library, service bus, queue, GraphQL layer, custom authentication, or organization switcher. Add infrastructure only when a client project has a demonstrated requirement.
