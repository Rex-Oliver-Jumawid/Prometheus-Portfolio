"use client";

import { useEffect } from "react";

export function HeroParallax() {
  useEffect(() => {
    const hero = document.getElementById("top");
    const stage = hero?.querySelector<HTMLElement>("[data-hero-stage]");
    const figure = hero?.querySelector<HTMLElement>("[data-hero-figure]");
    if (
      !hero ||
      !stage ||
      !figure ||
      typeof window.matchMedia !== "function"
    )
      return;

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
        target.style.removeProperty("--hero-reveal-distance");
      });
      hero!.style.removeProperty("--hero-scroll-distance");
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
      if (preference.matches) {
        distance = 0;
        return;
      }

      // Drive the reveal from the artwork itself instead of a fixed head/knee
      // stop. The final frame aligns the bottom of Prometheus with the bottom
      // of the sticky viewport, so the complete figure is revealed before the
      // next section can enter.
      const figureHeight = figure!.getBoundingClientRect().height;
      const revealDistance = Math.max(
        0,
        figure!.offsetTop + figureHeight - stage!.clientHeight,
      );

      distance = revealDistance;
      targets.forEach((target) => {
        target.style.setProperty(
          "--hero-reveal-distance",
          `${revealDistance}px`,
        );
      });
      hero!.style.setProperty("--hero-scroll-distance", `${distance}px`);
      schedule();
    }

    function motionChanged() {
      if (preference.matches) {
        delete hero!.dataset.parallaxReady;
        distance = 0;
        clearMotion();
      } else {
        hero!.dataset.parallaxReady = "true";
        measure();
      }
    }

    motionChanged();
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    observer.observe(stage);
    observer.observe(figure);
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
