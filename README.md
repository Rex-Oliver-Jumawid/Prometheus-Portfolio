# Business application starter

A production-minded starting point for small and medium business applications. It is a modular Next.js application with Supabase authentication, straightforward RBAC, optional organization scope, a complete Customers reference feature, private file uploads, auditing, tests, and Vercel-ready CI.

## What is included

- Email/password login, logout, recovery, reset, verified SSR sessions, and protected routes
- Authenticated sidebar shell, profile menu/settings, responsive navigation, and route states
- Global `admin`, `manager`, and `staff` roles with server-side `requirePermission()` and a UI-only `PermissionGuard`
- Optional organizations and memberships without forcing an organization switcher on single-company apps
- Complete Customers CRUD with Zod, Server Actions, React Hook Form, shadcn-style UI, TanStack Table, URL search/filter/sort/page state, RLS, revalidation, auditing, and tests
- Private Supabase Storage uploads with metadata, validation, signed downloads, deletion, and personal/organization policies
- Real migrations, generated database types, deterministic local users/data, pgTAP RLS tests, and database advisors
- GitHub Actions for application quality checks plus migration reset, generated types, pgTAP, and database advisors

## Requirements

- Node.js 24 (see `.nvmrc`)
- Corepack and pnpm 11
- Docker-compatible runtime for local Supabase
- Supabase CLI (installed as a project dependency)

## Start locally

Create a new repository using this GitHub template, clone it, and run from that repository:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm template:init --name "Acme Inventory" --slug acme-inventory --support-email support@acme.example --port-base 59420
# Review the preview, then apply the same options:
pnpm template:init --name "Acme Inventory" --slug acme-inventory --support-email support@acme.example --port-base 59420 --apply
pnpm db:start
pnpm db:reset
```

The initializer sets branding, package name, Supabase identity/ports, and template provenance. It creates `.env.local` if missing and preserves an existing one. **Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` to the Publishable key shown by `pnpm db:start` or `pnpm exec supabase status`.** The example intentionally leaves it empty because each project has its own key.

```bash
pnpm template:doctor
pnpm dev
```

Choose a different block of 100 Supabase ports for each concurrently running project. The app still defaults to port 3000. Initialization does not create hosted resources. For testing the unchanged baseline or running multiple apps, see [getting started](docs/getting-started.md).

Open `http://127.0.0.1:3000` and sign in with a local-only account:

| Role    | Email                  | Password      |
| ------- | ---------------------- | ------------- |
| Admin   | `admin@example.test`   | `Starter123!` |
| Manager | `manager@example.test` | `Starter123!` |
| Staff   | `staff@example.test`   | `Starter123!` |

The seeded data and credentials are for local development only. Never reproduce them in a hosted project.

## Common commands

```bash
pnpm template:init --help # preview/configure a fresh client copy
pnpm template:doctor     # local tools, configuration, and port diagnostics
pnpm verify              # lint, typecheck, unit/script tests, and build
pnpm dev                 # Next.js development server
pnpm lint                # ESLint
pnpm typecheck           # strict TypeScript
pnpm test                # Vitest and initializer tests
pnpm build               # production build (webpack mode)
pnpm test:e2e            # Playwright critical flows
pnpm db:start            # start isolated local Supabase ports
pnpm db:reset            # rebuild schema and deterministic seed
pnpm db:types            # regenerate checked-in database types
pnpm db:test             # pgTAP authorization/RLS tests
```

## Configuration and branding

Runtime name, description, mark, and support address live only in [`src/config/app.ts`](src/config/app.ts). The initializer sets these values along with the package name and local Supabase project ID; do not rename them before initialization. All runtime environment variables are documented in `.env.example` and validated by `src/config/env.ts`.

## Documentation

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Database and tenancy](docs/database.md)
- [Authentication](docs/authentication.md)
- [Permissions](docs/permissions.md)
- [Creating a feature](docs/creating-a-feature.md)
- [Deployment](docs/deployment.md)
- [Template checklist](docs/template-checklist.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Client business context](docs/business-context.md)
- [Feature specification](docs/feature-spec.md)
- [Client operations and recovery](docs/operations.md)
- [Template releases and client patches](docs/template-maintenance.md)
- [Building and adopting reusable modules](docs/reusable-modules.md)

New attachments are limited to 4 MB. Public signup is disabled locally; hosted internal apps must explicitly disable it in Supabase Auth before launch. Complete hosted verification in the operations runbook.

Read `AGENTS.md` before using a coding agent in this repository.
