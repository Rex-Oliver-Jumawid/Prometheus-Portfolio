"use client";

import { useEffect } from "react";

export function HeroParallax() {
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero || typeof window.matchMedia !== "function") return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | undefined;

    function clearMotion() {
      hero.style.removeProperty("--hero-scene-y");
      hero.style.removeProperty("--hero-figure-y");
      hero.style.removeProperty("--hero-copy-y");
    }

    function sync() {
      frame = undefined;
      if (preference.matches) {
        clearMotion();
        return;
      }

      const distance = Math.min(
        Math.max(window.scrollY, 0),
        window.innerHeight * 1.2,
      );
      hero.style.setProperty("--hero-scene-y", `${distance * 0.12}px`);
      hero.style.setProperty("--hero-figure-y", `${distance * 0.065}px`);
      hero.style.setProperty("--hero-copy-y", `${distance * 0.035}px`);
    }

    function schedule() {
      if (frame === undefined) frame = window.requestAnimationFrame(sync);
    }

    function motionChanged() {
      if (preference.matches) clearMotion();
      else schedule();
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", motionChanged);
    sync();

    return () => {
      window.cancelAnimationFrame(frame ?? 0);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      preference.removeEventListener("change", motionChanged);
      clearMotion();
    };
  }, []);

  return null;
}
