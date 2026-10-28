# Arounda reference implementation

The /studio route is a separate, non-production visual experiment for the Prometheus portfolio.
It preserves the current homepage and uses Arounda's public website and the user's Figma import as layout references.

## Reference material

- https://arounda.agency/
- https://www.figma.com/design/YxFBWKsidf75c6OoHC8Vxi/Untitled--Copy-

The Figma import is 1536 pixels wide and contains the navigation, editorial hero with serif-italic inline pills, client strip, services, case studies, company information, and contact footer.

## Preserved design ideas

- Dark background with violet lighting and electric-lime CTAs
- Three-line oversized editorial hero and italic pill typography
- Rounded three-column services panel
- Asymmetric sticky project descriptions and vertically stacked visuals
- Responsive tablet and mobile layouts, including a mobile menu

## Brand and asset boundaries

This is not a replica to publish as-is.
Arounda's original images, client logos, awards, reviews, and performance statistics are excluded.
The case-study visuals are original CSS illustrations, supplemented by the repository's existing Furniture Odyssey dashboard screenshot.
Illustrative dashboard metrics are labeled as sample data.
Gordita is not bundled because a licensed font file has not been supplied.
DM Sans and a browser serif fallback are temporary typography substitutes.
The contact email is provisional and must be confirmed before launch.

## Implementation and verification

- UI route: src/app/studio/page.tsx
- Styling: src/app/studio/studio.module.css
- Browser tests: tests/e2e/studio.spec.ts

Verify at 1536x900, 1440x900, 768x1024 and 390x844.
Compare the hero line breaks, text metrics, container spacing, cards, images, CTA dimensions and responsive behavior.
Run pnpm lint, pnpm typecheck, pnpm test, pnpm build, then pnpm test:e2e.
Do not merge before approval of real assets and brand direction.
