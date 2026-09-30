# Portfolio coding conventions

- Keep the public portfolio fast, accessible, and deployable without backend services unless a feature clearly requires them.
- Keep pages and case studies server-rendered by default.
- Add "use client" only for browser state, events, or animation that requires client-side JavaScript.
- Prefer complete vertical slices over placeholder infrastructure.
- Add shared abstractions only after real reuse appears.
- Preserve reduced-motion behavior for non-essential animation.
- Treat responsive behavior, keyboard navigation, semantic structure, and visible focus states as part of each feature.
- Do not reintroduce the former business-template auth, RBAC, customer, storage, or Supabase layers unless the portfolio gains an explicit application requirement.
- Keep documentation aligned with the implemented behavior and project structure.

Before completion, run `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
Add focused tests when the first behavior worth testing is introduced.
