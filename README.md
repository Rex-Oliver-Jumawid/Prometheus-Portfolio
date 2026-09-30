# Prometheus portfolio

Prometheus V2 is a clean Next.js starter for the Prometheus portfolio.

The repository intentionally contains no designed screens, reusable UI library, backend integration, or application-specific feature code yet.
It is a blank development baseline for building the portfolio from scratch.

## Stack

- Next.js
- React
- TypeScript
- pnpm
- ESLint
- Prettier

## Local development

Requirements:

- Node.js 24
- Corepack
- pnpm 11

Run:

```bash
corepack enable
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000`.

The root route intentionally renders no interface yet.

## Quality checks

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Or run all three with:

```bash
pnpm verify
```

## Current structure

- `src/app/layout.tsx` provides the required App Router root layout.
- `src/app/page.tsx` is an intentionally blank root route.
- `eslint.config.mjs` contains the Next.js lint configuration.
- `tsconfig.json` contains the TypeScript configuration.
- `.github/workflows/ci.yml` verifies linting, typechecking, and production builds.

Documentation files are intentionally retained while implementation starts from a clean slate.
