# Contributing

Keep changes small, feature-focused, and easy for a three-developer team to review.

## Local setup

Follow [docs/getting-started.md](docs/getting-started.md). Local Supabase ports are defined in `supabase/config.toml`; initialized copies use their chosen port family. Run `pnpm db:stop` when finished.

## Working agreement

- Branch from `main` with a short-lived `feat/`, `fix/`, `chore/`, or `refactor/` branch.
- Follow `AGENTS.md` and the existing Customers reference feature.
- Add migrations and regenerated database types together.
- Update documentation when behavior, configuration, architecture, or workflows change.
- Use conventional commit messages such as `feat: add supplier management`.
- Prefer squash merging after focused review and passing CI.

Run before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm db:reset && pnpm db:test` for database or authorization changes and `pnpm test:e2e` for critical auth/routing/workflow changes.
