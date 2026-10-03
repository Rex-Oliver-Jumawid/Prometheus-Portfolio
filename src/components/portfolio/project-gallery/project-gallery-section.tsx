import Link from "next/link";

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
      data-standalone={standalone ? "true" : undefined}
      aria-labelledby="gallery-title"
    >
      <GalleryBackdrop />

      {standalone ? (
        <>
          <header className={styles.header}>
            <Link
              href="/"
              className={styles.wordmark}
              aria-label="Prometheus home"
            >
              Prometheus<span aria-hidden="true">®</span>
            </Link>
            <p>
              Selected work <span>01 / 01</span>
            </p>
          </header>
          <div className={styles.copy}>
            <p className={`${styles.eyebrow} ${styles.copyEyebrow}`}>
              <span className={styles.shortRule} aria-hidden="true" />A
              Prometheus case study
            </p>
            <Heading id="gallery-title">
              Furniture <em>Odyssey.</em>
            </Heading>
            <p className={styles.summary}>{furnitureOdyssey.summary}</p>
          </div>
        </>
      ) : (
        <Heading id="gallery-title" className={styles.srOnly}>
          Furniture Odyssey
        </Heading>
      )}

      <ProjectGalleryClient project={furnitureOdyssey} />

      <noscript>
        <p className={styles.noScript}>
          Enable JavaScript to open and read Furniture Odyssey.
        </p>
      </noscript>
    </section>
  );
}
