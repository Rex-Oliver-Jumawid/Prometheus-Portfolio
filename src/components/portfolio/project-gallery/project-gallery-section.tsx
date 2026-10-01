import Link from "next/link";

import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/libre-caslon-display/latin-400.css";

import { furnitureOdyssey } from "@/content/projects";

import { GalleryBackdrop } from "./gallery-backdrop";
import { ProjectGalleryClient } from "./project-gallery-client";
import styles from "./project-gallery.module.css";

export function ProjectGallerySection({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  const Heading = standalone ? "h1" : "h2";
  return (
    <section
      id="work"
      className={styles.gallery}
      aria-labelledby="gallery-title"
    >
      <GalleryBackdrop />
      <header className={styles.header}>
        {standalone && (
          <Link
            href="/"
            className={styles.wordmark}
            aria-label="Prometheus home"
          >
            Prometheus<span aria-hidden="true">®</span>
          </Link>
        )}
        <p>
          Selected work <span>01 / 01</span>
        </p>
      </header>
      <ProjectGalleryClient project={furnitureOdyssey} />
      <div className={styles.copy}>
        <p className={`${styles.eyebrow} ${styles.copyEyebrow}`}>
          <span className={styles.shortRule} aria-hidden="true" />A Prometheus
          case study
        </p>
        <Heading id="gallery-title">
          Furniture <em>Odyssey.</em>
        </Heading>
        <p className={styles.summary}>{furnitureOdyssey.summary}</p>
      </div>
      <noscript>
        <p className={styles.noScript}>
          Enable JavaScript to open and read Furniture Odyssey.
        </p>
      </noscript>
    </section>
  );
}
