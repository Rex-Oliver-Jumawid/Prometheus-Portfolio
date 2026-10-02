"use client";

import { useEffect } from "react";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smooth(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function sectionStart(section: HTMLElement) {
  const measured = Number(section.dataset.viewportStart);
  if (Number.isFinite(measured)) return measured;

  // Fallback before StickyViewports has measured the stack.
  const root = section.parentElement;
  if (!root) return section.getBoundingClientRect().top + window.scrollY;

  let start = root.getBoundingClientRect().top + window.scrollY;
  for (const child of Array.from(root.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child === section) return start;
    if (child.tagName === "SECTION") start += child.getBoundingClientRect().height;
  }
  return start;
}

export function ProjectBookHandoff() {
  useEffect(() => {
    const work = document.getElementById("work");
    const library = document.getElementById("library");
    if (!work || !library) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | undefined;

    function publishProgress(progress: number) {
      document.documentElement.dataset.bookHandoffProgress = String(progress);
      document.dispatchEvent(
        new CustomEvent("prometheus:book-handoff-progress", {
          detail: { progress },
        }),
      );
    }

    function update() {
      frame = undefined;

      const workStart = sectionStart(work);
      const libraryStart = sectionStart(library);
      const workHeight =
        Number(work.dataset.viewportHeight) || work.getBoundingClientRect().height;

      // Only animate in the actual work -> library corridor.
      // The book is fully owned by the work section before this point, and fully
      // owned by the library after it. This prevents it from leaking into hero/footer.
      const start =
        libraryStart - Math.min(workHeight * 0.62, window.innerHeight * 0.52);
      const end = libraryStart + window.innerHeight * 0.12;

      const rawProgress = clamp01(
        (window.scrollY - start) / Math.max(1, end - start),
      );

      // Hard ownership guards are intentional. Sticky siblings can remain
      // visually pinned outside their normal-flow range.
      const guardedProgress =
        window.scrollY < workStart
          ? 0
          : window.scrollY > end
            ? 1
            : rawProgress;

      const progress = reducedMotion.matches
        ? guardedProgress >= 0.5
          ? 1
          : 0
        : smooth(guardedProgress);

      publishProgress(progress);
    }

    function schedule() {
      if (frame === undefined) frame = window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);

    // StickyViewports measures in an effect too. Queue twice so its canonical
    // starts are available even on the initial load.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(schedule);
    });

    return () => {
      window.cancelAnimationFrame(frame ?? 0);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
      publishProgress(0);
      delete document.documentElement.dataset.bookHandoffProgress;
    };
  }, []);

  return null;
}
