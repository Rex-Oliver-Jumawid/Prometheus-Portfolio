import type { Metadata } from "next";

import { ProjectGallerySection } from "@/components/portfolio/project-gallery/project-gallery-section";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: `Furniture Odyssey — ${appConfig.name}`,
  description:
    "A floating Furniture Odyssey book above a restoring Corinthian pillar.",
};

export default function GalleryPage() {
  return (
    <main>
      <ProjectGallerySection standalone />
    </main>
  );
}
