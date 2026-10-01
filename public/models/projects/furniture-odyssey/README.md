# Furniture Odyssey presentation asset

Source: https://github.com/PaulEscobia13/furniture-odyssey-book
Source commit: `defcda46a2b83fec9b58396fea5665733edf4df2`.

`book.glb` and `cover.png` are unchanged copies of `furniture-odyssey.glb` and `furniture-odyssey.png`. Original root: `FO_Book_ROOT`, with separate front cover, endpaper, spine and page block. No embedded animation clips. Its exported orientation is preserved; the scene centers the measured bounding box and uniformly normalizes its longest dimension to 4.4m at full scale. Scroll position grows the book from 28% to 100% of that size, reversing on scroll up. Code follows the reference viewer's six-second centered float and slight rocking, without an automatic Y turn; manual controls return to rest after 1.1 seconds. Horizontal dragging adjusts the Y turn; vertical dragging adjusts the Z tilt. Embedded cover artwork is preserved and remains presentation, not the application's project/content registry.

`front-cover.png` is an exact extraction of the GLB's embedded `FO-frontcover` PNG (1054 x 1493 pixels, 1,724,728 bytes). This opaque flat artwork is used for the reader's hinged cover; `cover.png` is the separate transparent presentation mockup used by the gallery fallback. The reader derives its page aspect ratio from the flat artwork, preserving the model's cover proportions with uniform scaling and no artwork cropping.

The source's sample reading content is kept in `src/content/projects.ts`, rendered in a semantic HTML dialog. Next/Previous turns a sheet with the outgoing page on its front and the destination page on its back, then commits the spread when the 0.7-second turn completes. Project identity is assigned in TypeScript. The original repo's vendored Three.js and standalone HTML/CSS are not imported. Each load is owned by the scene, with mesh/material/texture/bitmap disposal on cleanup; see `docs/PROJECT_GALLERY.md`.
