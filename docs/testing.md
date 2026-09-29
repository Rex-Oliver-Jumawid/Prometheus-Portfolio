# Testing

Use the cheapest test that catches the likely failure.

- Vitest: permission matrices, Zod validation, formatting, and domain rules.
- Testing Library: accessible component behavior that cannot stay pure.
- pgTAP: grants, RLS allow/deny cases, policy regression, and database invariants.
- Playwright: a few critical journeys such as protected routing, sign-in, and canonical CRUD/files.

Unit/component tests live beside source as `*.test.ts(x)`. Database tests live in `supabase/tests`. Browser tests live in `tests/e2e`.

`pnpm test` also runs the Node tests in `scripts/*.test.mjs`, which exercise initialization on temporary copies and verify preservation of local configuration. Server authorization/action tests use a test-only `server-only` alias; application runtime boundaries remain enforced by Next.js.

Use `pnpm template:doctor --static` for repository configuration checks without Docker/port probes, and `pnpm verify` for the required application gate. To verify migrations without touching another project's local database, copy `supabase/config.toml`, migrations, seed, and tests to a temporary directory, assign a distinct project ID and ports, then pass `--workdir <directory>` to `db:start`, `db:reset`, `db:types`, `db:test`, and `db:advisors`. Type generation still writes to this repository and preserves the existing file on failure.

```bash
pnpm test
pnpm db:test
pnpm test:e2e
```

Before a pull request, always run lint, strict typecheck, unit tests, and build. For schema/policy changes, reset the database before pgTAP so tests prove the complete migration chain and deterministic seed.

Avoid implementation-detail assertions and broad snapshots. For denied RLS update/delete cases, prove both that no row was returned and that the target row remained unchanged.
