# Portfolio architecture

## Purpose

This document defines the implementation boundaries for the Prometheus portfolio before the new hero and 3D project gallery are built.
The immediate scope is the Hero page and the Figma page named `2nd viewport`.
The hero already has a working standalone artifact and should be translated into the repository rather than redesigned from scratch.
The second viewport will become an interactive Three.js scene built around classical pillars and three project books exported from Blender as GLB assets.

## Design sources

- Figma file: `Promotheus-Design-Improvements`.
- Hero page: node `117:113`.
- Second viewport page: node `133:305`.
- Hero direction: cinematic Prometheus artwork, cloud and sunlight atmosphere, editorial serif heading, minimal controls, and a 40 percent navigation panel when the hamburger is opened.
- Second viewport direction: three classical pillars, one project book per pillar, warm gallery lighting, and project selection through the books.
- Primary Prometheus palette visible in the design exploration: `#BF4646`, `#EDDCC6`, `#FFF4EA`, and `#7EACB5`.

Figma remains the visual source of truth while implementation details belong in the repository.
Do not copy experimental Figma layers into code merely because they are present on the exploration page.

## Architectural principles

1. Keep the homepage server-rendered by default.
2. Add client components only around interactions that require browser APIs, pointer input, animation state, or WebGL.
3. Keep Three.js behind one narrow client-side scene boundary.
4. Keep project content and project identity in TypeScript rather than inside GLB files.
5. Treat GLB files as visual assets with a documented technical contract.
6. Lazy-load Three.js and the GLB assets so the second viewport does not compete with the hero for initial loading resources.
7. Preserve an accessible DOM path for every action that can be performed through the 3D scene.
8. Respect `prefers-reduced-motion` and provide a stable non-animated state.

## Proposed source layout

Create these paths only when their first implementation is introduced.
Do not create empty architecture folders in advance.

```text
src/
  app/
    page.tsx
  components/
    portfolio/
      hero/
        hero-section.tsx
        hero-menu.tsx
      project-gallery/
        project-gallery-section.tsx
        project-gallery-client.tsx
        project-book-controls.tsx
  content/
    projects.ts
  lib/
    three/
      create-renderer.ts
      load-gltf.ts
public/
  models/
    gallery/
      pillars.glb
    projects/
      <project-slug>/
        book.glb
  media/
    hero/
```

`src/app/page.tsx` owns section composition and remains a Server Component.
`hero-menu.tsx` becomes a client island only if the polished artifact requires menu state or browser-driven motion.
`project-gallery-client.tsx` owns the canvas, renderer lifecycle, GLB loading, raycasting, camera state, and animation mixer.
`projects.ts` becomes the canonical source for project slug, title, summary, case-study content references, and the book model URL.

## Hero integration boundary

The existing hero artifact should be ported as a vertical slice.
Preserve its imagery, proportions, motion intent, hamburger behavior, and 40 percent navigation-panel concept.
Do not translate it into one monolithic `page.tsx` implementation.

The hero should be split by responsibility:

- Server-rendered structural content and links stay in `hero-section.tsx`.
- Hamburger state, menu transitions, and browser-only animation stay in `hero-menu.tsx` or another small client island.
- Large image and video assets stay under `public/media/hero` and are referenced by stable paths.
- Brand values stay centralized rather than being duplicated throughout CSS.

The hero must remain usable before JavaScript hydration finishes.
Navigation links must remain semantic links rather than canvas hit targets.

### Homepage hero scroll sequence

`hero.tsx` renders a viewport-height stage inside the hero section.
`hero.module.css` owns the character's responsive width, original top anchor, and maximum reveal distance.
The character's crown at source y=170px stops 4% of the viewport height below the top edge, with a gap clamped between 24px and 48px.
`hero-parallax.tsx` progressively pans the full-body character upward as the user scrolls down, with the sky travelling more slowly.
The sky and copy retain their relative parallax speeds, with faster copy movement on phones.
The hero has one viewport height of additional document flow, independent of the artwork pan distance.
Scroll progress maps proportionally to the full reveal distance, then clamps at the endpoint before the second section enters.
This duration uses screen distance because mouse-wheel rotation distances vary across devices and browser settings.
The stage pins independently inside the longer hero, so the page boundary cannot push the visible artwork upward during the handoff.
The stage clips the artwork to the viewport and the sky includes enough vertical overscan to cover the entire pan.
The `data-viewport-pin="top"` contract keeps this scroll sequence pinned at the top while other tall sections retain their existing bottom-edge pinning.
The gallery and book handoff continue deriving their positions from section flow heights.
The navigation glass shares the artwork anchors and scroll transforms without changing the drawer controls, layout, or banner hover behavior.
Reduced motion and the pre-hydration fallback use the original static, viewport-height composition without the additional hold.
Resize observers update the measured scroll duration, and the component releases its observers, listeners, animation frame, and style properties on unmount.

## Second viewport and Three.js boundary

The second viewport is the only planned Three.js scene in the current scope.
The scene should not own the page layout.
The section owns layout, headings, alternative controls, loading states, and responsive behavior in React and CSS.
The canvas fills only the visual scene region.

The Three.js scene is responsible for:

- Camera and renderer lifecycle.
- Loading the pillar GLB and the three book GLBs.
- Lighting and environment presentation.
- Book hover, focus, selection, and opening animation.
- Raycasting from pointer input.
- Coordinating animation completion with the React interaction state.

The React layer is responsible for:

- Project identity and project content.
- Accessible buttons or links corresponding to each book.
- Loading and error states.
- Case-study presentation.
- URL or overlay state.
- Reduced-motion policy.

## GLB asset contract

### Pillars

Use one scene asset at `public/models/gallery/pillars.glb` unless Blender iteration proves that separate pillar files are materially easier to maintain.
The pillar asset contains presentation geometry only.
The application positions the project books relative to explicit anchors or code-owned transforms.

Target Blender organization:

- Apply object transforms before export.
- Use meters consistently.
- Keep the scene centered around a predictable origin.
- Remove hidden geometry, unused materials, unused cameras, and unused lights unless they are intentionally part of the runtime asset.
- Prefer a small number of materials and texture atlases.
- Export only required animation data.

### Books

Use one GLB per project at `public/models/projects/<project-slug>/book.glb`.
A separate file per project lets the cover, materials, animation, and optimization change without re-exporting the entire gallery.

Each book should expose a single logical root object.
The application assigns the project ID after loading the GLB, so project routing never depends on arbitrary Blender node names.

Preferred animation clips are:

- `idle` for a subtle presentation loop when motion is allowed.
- `open` for the project-opening transition.
- `close` only if reverse playback of `open` is not visually correct.

Do not require an animation clip merely to satisfy the contract.
If a book ships without an idle clip, the application may apply a small code-driven transform to the root.
The opening motion should live in Blender when it includes page, cover, hinge, or deformation details that would be awkward to reproduce procedurally.

## Project data contract

The project collection should eventually follow a shape similar to this:

```ts
type PortfolioProject = {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  modelUrl: string;
  caseStudy: {
    problem: string;
    approach: string;
    outcome: string;
  };
};
```

The exact content shape can grow with the real case studies.
Do not store copy in `userData`, texture metadata, Blender object names, or animation clip names.

## Interaction state

The gallery should use a small explicit state model rather than scattered booleans.

```text
idle
  -> focused(project)
  -> opening(project)
  -> viewing(project)
  -> idle
```

`focused` represents hover, keyboard focus, or deliberate selection.
`opening` prevents duplicate interactions while the book-opening transition is running.
`viewing` means the case study surface is active.

The 3D layer should report semantic events such as `selectProject(slug)` rather than performing navigation or rendering case-study copy itself.

## Case-study presentation decision

The final presentation surface is intentionally not locked yet.
Two valid options remain:

- An in-place reader or overlay that preserves the gallery scene behind the open book.
- A dedicated route such as `/work/[slug]` that gives each case study a stable URL and a larger storytelling surface.

The architecture must support either choice.
Do not couple the Three.js scene directly to a route until the visual behavior is decided.
Project data should be structured so the same content can power either surface.

## Performance strategy

The hero owns the initial visual priority.
Do not load Three.js or project GLBs during the first render unless the second viewport is already close to the viewport.

Use a client boundary plus an intersection trigger to begin loading the 3D bundle shortly before the gallery becomes visible.
Keep the initial section shell renderable without the canvas.
Reserve scene dimensions to prevent layout shift.

Initial soft budgets:

- Keep the pillar GLB around 2 MB or less after reasonable optimization.
- Keep each book GLB around 1 MB or less when practical.
- Keep total initially requested 3D assets below roughly 5 MB before browser transfer compression when the visual quality allows it.

These are optimization targets rather than reasons to visibly damage the models.
Measure before enforcing stricter limits.

Use compressed textures and sensible texture dimensions before adding geometry compression.
Add Draco, Meshopt, KTX2, or another pipeline only when the measured asset cost justifies the added runtime complexity.

## Renderer lifecycle

Create exactly one renderer for the gallery canvas.
Dispose it when the client component unmounts.
Dispose geometries, materials, textures, animation mixers, event listeners, observers, and requestAnimationFrame work owned by the scene.
Clamp device pixel ratio rather than blindly using the full display pixel ratio on high-density screens.
Pause or reduce rendering when the gallery is outside the viewport.

## Responsive behavior

The desktop composition may use the Figma arrangement closely.
Tablet and mobile should preserve the conceptual hierarchy rather than squeezing the desktop camera framing into a narrow viewport.

Responsive scene behavior may change:

- Camera distance and field of view.
- Horizontal spacing between pillars.
- Book scale.
- Whether all three books appear at once.
- Whether the accessible project controls move below the canvas.

Do not hide project access on devices where precise hover is unavailable.

## Accessibility

The canvas is enhancement, not the only interface.
Every project must have an equivalent DOM control with a visible focus state.
Keyboard users must be able to select the same three projects.
Screen readers must receive project names and case-study content through semantic HTML.

When reduced motion is requested:

- Disable decorative floating loops.
- Avoid camera sweeps.
- Make the open transition immediate or very short.
- Keep the selected project state visually understandable.

## Error and fallback behavior

If WebGL initialization fails, show the gallery layout and project controls without the canvas.
If a single book asset fails, keep the other projects usable and expose the failed project through the DOM control.
If the pillar asset fails, do not block project access.

Asset errors should be visible in development and recoverable in production.

## Testing strategy

Unit tests should cover project data and interaction state independent of WebGL.
Component tests should cover loading, fallback, reduced-motion, and accessible project controls.
E2E tests should verify that each project is reachable from the second viewport and that the hero navigation remains usable.

Do not make pixel-perfect WebGL screenshots the only correctness test because GPU output can differ across environments.
Use browser-level visual checks selectively after the basic interaction path is stable.

## Decisions intentionally deferred

- Exact case-study surface: in-place reader versus dedicated route.
- Final Blender animation structure for the open-book sequence.
- Whether post-processing is needed.
- Whether React Three Fiber adds enough value to justify another abstraction layer.

The first implementation should use Three.js directly behind the narrow gallery client module.
If scene complexity grows enough that React Three Fiber meaningfully simplifies lifecycle and composition, revisit that choice with measured evidence.
