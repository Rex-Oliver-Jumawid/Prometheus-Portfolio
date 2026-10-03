import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";

import { prometheusLibrary } from "@/content/library";

import { ProjectLibraryClient } from "./project-library-client";
import styles from "./project-library.module.css";

export function ProjectLibrarySection() {
  return (
    <section
      id="library"
      className={styles.library}
      aria-labelledby="library-title"
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>{prometheusLibrary.eyebrow}</p>
        <div className={styles.heading}>
          <h2 id="library-title">{prometheusLibrary.title}</h2>
          <span>01 / 01</span>
        </div>
      </header>

      <ProjectLibraryClient />

      <noscript>
        <p className={styles.noScript}>
          Enable JavaScript to view Furniture Odyssey inside the Prometheus
          Library.
        </p>
      </noscript>
    </section>
  );
}
