"use client";

import { useEffect, useRef } from "react";

import styles from "./project-gallery.module.css";

export function GalleryBackdrop() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = layerRef.current?.closest("section");
    if (!section) return;
    let frame: number | undefined;

    function sync() {
      frame = undefined;
      if (!section) return;
      // Feather the entire panel into the hero, then restore its solid edge at rest.
      const seam =
        Math.min(280, window.innerHeight * 0.28) *
        Math.min(
          1,
          Math.max(
            0,
            section.getBoundingClientRect().top / (window.innerHeight * 0.45),
          ),
        );
      section.style.setProperty("--gallery-seam", `${seam}px`);
    }

    function schedule() {
      if (frame === undefined) frame = window.requestAnimationFrame(sync);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    sync();

    return () => {
      window.cancelAnimationFrame(frame ?? 0);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      section.style.removeProperty("--gallery-seam");
    };
  }, []);

  return <div ref={layerRef} className={styles.ambient} aria-hidden="true" />;
}
