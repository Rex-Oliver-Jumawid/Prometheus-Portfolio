# Contributing

Keep changes focused, reviewable, and aligned with the public portfolio.

## Local setup

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

## Working agreement

- Branch from `main` with a short-lived `feat/`, `fix/`, `chore/`, or `refactor/` branch.
- Follow `AGENTS.md`.
- Keep page content, visual changes, and tests together when they represent one user-facing slice.
- Preserve accessibility and reduced-motion behavior when adding interaction or animation.
- Update documentation when behavior, architecture, configuration, or workflows change.
- Prefer squash merging after focused review and passing CI.

Run before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm test:e2e` for critical routing, navigation, and public interaction changes.
