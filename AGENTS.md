# Portfolio coding conventions

- Keep the public portfolio fast, accessible, and deployable without backend services unless a feature clearly requires them.
- Keep the homepage and case studies server-rendered by default.
- Add `use client` only for browser state, events, or animation that cannot be expressed accessibly with CSS.
- Keep Three.js inside a narrow gallery client boundary rather than making the whole page a client component.
- Lazy-load the Three.js bundle and GLB assets near the project gallery so the hero remains the loading priority.
- Keep portfolio content and project identity in TypeScript, never in Blender node names, GLB metadata, or textures.
- Treat GLB files as presentation assets with documented roots, animation clips, scale, origin, and disposal behavior.
- Provide semantic DOM controls for any project action exposed through the 3D canvas.
- Preserve reduced-motion behavior for non-essential animation and provide a stable fallback when WebGL is unavailable.
- Dispose renderer resources, animation loops, event listeners, observers, geometries, materials, and textures owned by a Three.js client component.
- Keep portfolio content close to the route that owns it until a real reuse or content-management need appears.
- Prefer complete vertical slices over placeholder infrastructure.
- Treat responsive behavior, keyboard navigation, semantic headings, and visible focus states as part of the feature.
- Keep branding values centralized in `src/config/app.ts` or a dedicated canonical token source when the Figma palette is translated.
- Do not reintroduce the former business-template auth, RBAC, customer, storage, or Supabase layers unless the portfolio gains an explicit application requirement.
- Do not manually edit generated lockfiles.

Before completion, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
Run `pnpm test:e2e` for routing, navigation, or other critical browser-level changes.
