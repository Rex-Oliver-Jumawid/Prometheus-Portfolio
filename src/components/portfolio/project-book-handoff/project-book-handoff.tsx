"use client";

import { useEffect } from "react";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smooth(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function ProjectBookHandoff() {
  useEffect(() => {
    const library = document.getElementById("library");
    if (!library) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | undefined;

    function publishProgress(progress: number) {
      document.dispatchEvent(
        new CustomEvent("prometheus:book-handoff-progress", {
          detail: { progress },
        }),
      );
    }

    function update() {
      frame = undefined;

      const libraryRect = library.getBoundingClientRect();
      const startTop = window.innerHeight * 0.94;
      const endTop = window.innerHeight * 0.16;
      const rawProgress = clamp01(
        (startTop - libraryRect.top) / Math.max(1, startTop - endTop),
      );

      publishProgress(reducedMotion.matches ? (rawProgress >= 0.5 ? 1 : 0) : smooth(rawProgress));
    }

    function schedule() {
      if (frame === undefined) frame = window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame ?? 0);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
    };
  }, []);

  return null;
}
