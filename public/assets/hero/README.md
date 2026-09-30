# Hero artwork

Extracted from `.model/prometheus-hero-self-contained.html`.

- `sky.webp`: the original 1672 × 941 background, encoded as WebP at quality 86.
- `figure.webp`: the visible upper 986 × 718 pixels of the original 986 × 1595 figure, matching the prototype's clipped character window; encoded as WebP at quality 86. Transparency is preserved.
- `prometheus-mark.png`: the original logo mask, resized to 120 pixels tall for the ribbon and avatar.

These are decorative presentation assets. Hero content and section destinations live in `src/app/_components/`. Images are delivered through `next/image`; the sky has loading priority. The Instrument Serif fonts are self-hosted in `src/app/_fonts/`, with their accompanying OFL license.
