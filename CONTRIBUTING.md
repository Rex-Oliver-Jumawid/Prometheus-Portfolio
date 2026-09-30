# Contributing

Keep changes focused, reviewable, and aligned with the public portfolio.

## Local setup

```bash
corepack enable
pnpm install
pnpm dev
```

## Working agreement

- Branch from `main` with a short-lived `feat/`, `fix/`, `chore/`, or `refactor/` branch when collaboration requires review.
- Follow `AGENTS.md`.
- Build features as complete vertical slices.
- Preserve accessibility and reduced-motion behavior when adding interaction or animation.
- Update documentation when behavior, architecture, configuration, or workflows change.
- Prefer squash merging after focused review and passing CI.

Run before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Add focused automated tests when new behavior creates meaningful regression risk.
