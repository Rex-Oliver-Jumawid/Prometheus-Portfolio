"use client";

import { useEffect } from "react";

export function HeroParallax() {
  useEffect(() => {
    const hero = document.getElementById("top");
    const stage = hero?.querySelector<HTMLElement>("[data-hero-stage]");
    if (!hero || !stage || typeof window.matchMedia !== "function") return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const glass = document.querySelector<HTMLElement>(
      "[data-navigation-glass]",
    );
    const targets = glass ? [hero, glass] : [hero];
    let frame: number | undefined;
    let distance = 0;

    function clearMotion() {
      targets.forEach((target) => {
        target.style.removeProperty("--hero-progress");
      });
    }

    function sync() {
      frame = undefined;
      if (preference.matches) {
        clearMotion();
        return;
      }
      // Use the document flow start; a pinned section's visual top never moves.
      const start = Number(hero!.dataset.viewportStart ?? 0);
      const progress =
        distance > 0
          ? Math.min(1, Math.max(0, (window.scrollY - start) / distance))
          : 0;
      targets.forEach((target) => {
        target.style.setProperty("--hero-progress", String(progress));
      });
    }

    function schedule() {
      if (frame === undefined) frame = window.requestAnimationFrame(sync);
    }

    function measure() {
      // CSS owns the artwork anchors and responsive dimensions. The hero's
      // extra flow height controls duration independently of the artwork's pan.
      distance = Math.max(
        0,
        hero!.getBoundingClientRect().height -
          stage!.getBoundingClientRect().height,
      );
      schedule();
    }

    function motionChanged() {
      if (preference.matches) {
        delete hero!.dataset.parallaxReady;
        clearMotion();
      } else {
        hero!.dataset.parallaxReady = "true";
      }
      measure();
    }

    motionChanged();
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    observer.observe(stage);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    preference.addEventListener("change", motionChanged);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame ?? 0);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      preference.removeEventListener("change", motionChanged);
      delete hero.dataset.parallaxReady;
      clearMotion();
    };
  }, []);

  return null;
}
