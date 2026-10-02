"use client";

import { useEffect } from "react";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smooth(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function documentFlowTop(element: HTMLElement) {
  let top = 0;
  let current: HTMLElement | null = element;

  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top;
}

export function ProjectBookHandoff() {
  useEffect(() => {
    const work = document.getElementById("work");
    const library = document.getElementById("library");
    if (!work || !library) return;

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

      const workTop = documentFlowTop(work);
      const libraryTop = documentFlowTop(library);
      const workHeight = work.offsetHeight;
      const libraryHeight = library.offsetHeight;

      // The handoff belongs only to the lower part of the floating-book panel
      // and the opening part of the library panel. Using normal-flow offsets
      // keeps this stable even though both panels become position: sticky.
      const start = workTop + workHeight * 0.38;
      const end = Math.max(
        start + window.innerHeight * 0.36,
        libraryTop + libraryHeight * 0.08,
      );

      const rawProgress = clamp01(
        (window.scrollY - start) / Math.max(1, end - start),
      );

      const progress = reducedMotion.matches
        ? rawProgress >= 0.5
          ? 1
          : 0
        : smooth(rawProgress);

      publishProgress(progress);
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
      publishProgress(0);
    };
  }, []);

  return null;
}
