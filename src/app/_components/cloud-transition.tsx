"use client";

import { useEffect, useRef } from "react";

import type { CloudField } from "./create-cloud-field";
import styles from "./cloud-transition.module.css";

export function CloudTransition() {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const hero = document.getElementById("top");
    const gallery = document.getElementById("work");
    const stage = hero?.querySelector<HTMLElement>("[data-hero-stage]");
    if (
      !layer ||
      !canvas ||
      !hero ||
      !stage ||
      typeof window.matchMedia !== "function"
    )
      return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let field: CloudField | undefined;
    let loading = false;
    let disposed = false;
    let failed = false;
    let frame: number | undefined;

    function hide() {
      gallery?.style.removeProperty("--gallery-cloud-offset");
      if (gallery) delete gallery.dataset.cloudReveal;
      delete layer!.dataset.active;
    }

    function sync() {
      frame = undefined;
      if (motion.matches || document.hidden || !field) {
        hide();
        return;
      }

      const height = stage!.getBoundingClientRect().height;
      const reveal = Math.max(0, hero!.getBoundingClientRect().height - height);
      // Start within the existing reveal instead of adding another scroll track.
      const lead = Math.min(reveal, height * 0.28);
      const originalStart =
        Number(hero!.dataset.viewportStart ?? 0) + reveal - lead;
      const destination = Number(
        gallery?.dataset.viewportStart ?? originalStart + lead + height,
      );
      // Keep the gallery handoff at the same point with a 40% shorter cloud track.
      const distance = (destination - originalStart) * 0.6;
      const start = destination - distance;
      const progress = (window.scrollY - start) / Math.max(1, distance);
      if (progress <= 0 || progress >= 1) {
        hide();
        return;
      }

      layer!.dataset.active = "true";
      field.draw(progress);

      // Place the gallery beneath opaque clouds and hold it still as they clear.
      if (progress >= 0.25) {
        if (gallery) gallery.dataset.cloudReveal = "true";
        gallery?.style.setProperty(
          "--gallery-cloud-offset",
          `${Math.max(0, destination - window.scrollY)}px`,
        );
      } else {
        gallery?.style.removeProperty("--gallery-cloud-offset");
        if (gallery) delete gallery.dataset.cloudReveal;
      }
    }

    function schedule() {
      if (frame === undefined) frame = window.requestAnimationFrame(sync);
    }

    function measure() {
      if (!motion.matches && !failed) {
        field?.resize(window.innerWidth, window.innerHeight);
      }
      schedule();
    }

    async function prepare() {
      if (field || loading || motion.matches || failed) return;
      loading = true;
      try {
        const { createCloudField } = await import("./create-cloud-field");
        if (disposed || motion.matches || failed) return;
        const nextField = await createCloudField(canvas!);
        if (disposed || motion.matches || failed) {
          nextField?.dispose();
          return;
        }
        field = nextField;
        if (!field) throw new Error("Cloud renderer unavailable");
        measure();
      } catch {
        // Native section scrolling remains available if canvas cannot initialize.
        hide();
        failed = true;
      } finally {
        loading = false;
      }
    }

    function motionChanged() {
      if (motion.matches) {
        hide();
        field?.dispose();
        field = undefined;
      } else if (!field) {
        scrolled();
      }
      measure();
    }

    function contextLost(event: Event) {
      event.preventDefault();
      hide();
      failed = true;
      field?.dispose();
      field = undefined;
    }

    // Prepare only near the hero, leaving its image loading first and skipping deep links.
    function scrolled() {
      const start = Number(hero!.dataset.viewportStart ?? 0);
      if (
        !document.hidden &&
        window.scrollY > start &&
        window.scrollY < start + hero!.getBoundingClientRect().height
      ) {
        void prepare();
      }
      schedule();
    }

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(hero);
    window.addEventListener("scroll", scrolled, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", motionChanged);
    canvas.addEventListener("webglcontextlost", contextLost);
    measure();
    scrolled();

    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame ?? 0);
      window.removeEventListener("scroll", scrolled);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", motionChanged);
      canvas.removeEventListener("webglcontextlost", contextLost);
      field?.dispose();
      hide();
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className={styles.transition}
      aria-hidden="true"
      data-cloud-transition
    >
      <canvas
        key="volumetric-clouds"
        ref={canvasRef}
        className={styles.canvas}
      />
    </div>
  );
}
