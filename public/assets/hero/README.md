# Hero artwork

The hero combines the original prototype assets with the supplied full-body scroll artwork.

- `sky.webp`: the original 1672 × 941 background, encoded as WebP at quality 86.
- `figure.webp`: the visible upper 986 × 718 pixels of the original 986 × 1595 figure, matching the prototype's clipped character window; encoded as WebP at quality 86. Transparency is preserved.
- `prometheus-mark.png`: the original logo mask, resized to 120 pixels tall for the ribbon and avatar.
- `sky-scroll.webp`: the supplied 1448 × 1086 Baroque Sunbeams Over Golden Clouds background, encoded as WebP at quality 90.
- `figure-full.webp`: the supplied full 986 × 1595 Prometheus character, encoded as lossless WebP with transparency preserved.

The homepage and navigation glass use `sky-scroll.webp` and `figure-full.webp`.
The full-body image is never cropped during asset preparation.
CSS preserves the original character's width and top anchor, then the viewport reveals the lower knee at source coordinate 1120px during scrolling.

These are decorative presentation assets. Hero content and section destinations live in `src/app/_components/`. Images are delivered through `next/image`; the sky has loading priority. The Instrument Serif fonts are self-hosted in `src/app/_fonts/`, with their accompanying OFL license.
