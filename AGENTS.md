# Portfolio coding conventions

- Keep the public portfolio fast, accessible, and deployable without backend services unless a feature clearly requires them.
- Keep the homepage and case studies server-rendered by default.
- Add "use client" only for browser state, events, or animation that cannot be expressed accessibly with CSS.
- Keep portfolio content close to the route that owns it until a real reuse or content-management need appears.
- Prefer complete vertical slices over placeholder infrastructure.
- Preserve reduced-motion behavior for non-essential animation.
- Treat responsive behavior, keyboard navigation, semantic headings, and visible focus states as part of the feature.
- Keep branding values centralized in `src/config/app.ts`.
- Do not reintroduce the former business-template auth, RBAC, customer, storage, or Supabase layers unless the portfolio gains an explicit application requirement.

Before completion, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
Run `pnpm test:e2e` for routing, navigation, or other critical browser-level changes.
