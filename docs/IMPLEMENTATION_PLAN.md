# Implementation plan

## Current scope

Only the Hero and second viewport are in the active implementation scope.
No additional portfolio viewports should be built until these two slices are visually and technically stable.

## Phase 0 - Foundation

Status after this architecture change:

- Preserve the existing public-first Next.js baseline.
- Add Three.js and its TypeScript definitions.
- Record the Figma source nodes and 3D asset contract.
- Keep the existing homepage code untouched until the hero artifact is ready to be translated.

Exit criteria:

- Frozen dependency installation succeeds.
- CI remains green.
- Architecture docs match the agreed interaction model.

## Phase 1 - Hero artifact integration

Goal: translate the existing working hero artifact into the repository without redesigning it.

Work:

- Inventory every image, icon, font, and animation used by the artifact.
- Move required assets to stable `public/media/hero` paths.
- Port the artifact into a focused Hero component.
- Isolate hamburger and navigation-panel state in a client component.
- Match the Figma Hero page at desktop first.
- Add tablet and mobile behavior after the desktop composition is stable.
- Preserve the planned 40 percent navigation panel when the hamburger opens.
- Keep links semantic and keyboard accessible.

Verification:

- Compare the running page against Figma at the target desktop viewport.
- Verify navigation open and close behavior with pointer and keyboard.
- Verify no layout shift from hero media.
- Run lint, typecheck, unit tests, build, and the relevant E2E path.

## Phase 2 - Static 3D gallery composition

Goal: reproduce the second viewport composition with real GLB assets before adding project-opening behavior.

Work:

- Export and optimize `pillars.glb` from Blender.
- Export one `book.glb` for each of the three projects.
- Build the gallery client boundary with one Three.js renderer.
- Add camera, lights, model loading, resize handling, disposal, and a non-WebGL fallback.
- Match pillar spacing, book placement, lighting, and background to the Figma second viewport.
- Lazy-load the Three.js client bundle and GLBs near the viewport.

Verification:

- No Three.js code is part of the hero's critical rendering path.
- The canvas does not cause cumulative layout shift.
- Resize and orientation changes preserve a usable composition.
- Navigating away from the page does not leave render loops or WebGL resources alive.

## Phase 3 - Book interaction

Goal: make each book a reliable project selector.

Work:

- Add raycast hit detection.
- Add hover and focus presentation.
- Add the explicit gallery interaction state.
- Play the book `open` animation when present.
- Provide equivalent DOM project controls.
- Trigger a semantic `selectProject(slug)` event after the transition reaches the correct point.

Verification:

- Repeated clicks cannot start overlapping open animations.
- Keyboard selection reaches every project.
- Reduced-motion mode skips decorative motion.
- Asset failure for one project does not block the other two.

## Phase 4 - Case-study surface

Goal: reveal how each project was approached and built.

Before implementation, choose one presentation direction:

- In-place book reader or overlay.
- Dedicated `/work/[slug]` route.

The decision should be made from the desired storytelling behavior, not from Three.js constraints.

Content should cover at minimum:

- Context or problem.
- What Prometheus observed.
- Design and implementation approach.
- Important product or engineering decisions.
- Result or current outcome.

## Phase 5 - Polish and performance

Work:

- Tune scene lighting and shadows.
- Optimize GLB geometry and textures based on measured transfer and render cost.
- Add subtle idle motion only if it improves the composition.
- Validate low-power devices and touch input.
- Add selective visual regression coverage for the hero and gallery.

Exit criteria:

- The two viewports feel like one continuous Prometheus experience.
- Project access works without WebGL.
- The hero remains the loading priority.
- The 3D scene is responsive, disposable, and measured rather than permanently rendering offscreen.
