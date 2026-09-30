# Prometheus portfolio

Public portfolio for Prometheus, built with Next.js, React, TypeScript, and Tailwind CSS.

This repository started from an internal business application template.
The portfolio initialization removes the authentication, Supabase, RBAC, database, customer-management, and private-file runtime surface so the public site is the primary product.

## Local development

Requirements:

- Node.js 24
- Corepack
- pnpm 11

Run:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3000`.

No environment variables or local database are required for the current portfolio baseline.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the browser-level homepage check with:

```bash
pnpm test:e2e
```

## Structure

- `src/app/page.tsx` contains the public portfolio composition and project data.
- `src/app/globals.css` contains the visual system, responsive behavior, and motion.
- `src/config/app.ts` is the canonical source for portfolio name and description.
- `tests/e2e/home.spec.ts` covers the critical public homepage path.

The remaining UI dependencies are intentionally left locked to the original template lockfile for a safe first initialization.
They can be pruned later with pnpm when the final component direction is settled, without hand-editing the generated lockfile.

## Current direction

The baseline is intentionally public-first, static-friendly, and independent from backend infrastructure.
It provides a Prometheus-branded hero, selected work, approach, capabilities, and contact handoff area without committing the site to a CMS or application backend.
