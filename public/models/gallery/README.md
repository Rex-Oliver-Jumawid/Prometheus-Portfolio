# Wide Corinthian pillar

These assets are retained from the earlier restoration study. The current book-only gallery does not load or display the pillar or its poster. The presentation details below describe that earlier study.

`pillars.glb` is the textured Blender asset from the pillar restoration study. This viewport loads one pillar. Scene root: `Portfolio_Pillar`; units: meters; origin at the base. The original wide profile is encoded in the asset's root scale (glTF X/Z 1.4, Y 1). The viewport additionally scales a parent group to X/Z 1.25, Y 0.68 for the requested wider, shorter presentation, preserving animated transforms.

Restored asset height: 4.73m (3.22m in the viewport). Thirteen meshes, 159,367 triangles, shared 2048px base-color/normal/roughness/occlusion textures. The `Restore` clip has 22 transform channels on 11 sections and lasts 2 seconds. Its first pose is broken; its last pose is restored. The scene samples the clip directly from reversible scroll progress. Reduced motion samples the final pose immediately. `Book_Support` is a presentation marker; business identity does not come from this GLB.

The book is positioned by code above the capital at Y 4.70m when restored, normalized to a 2.9m longest dimension. It starts 1.2m higher and descends with restoration. `pillar-restored.png` is the static fallback. Resource ownership/disposal is documented in `docs/PROJECT_GALLERY.md`.
