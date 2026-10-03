"use client";

import Lenis from "lenis";
import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;

    const syncScrollLock = () => {
      const bodyStyle = getComputedStyle(document.body);
      const overflow =
        document.body.style.overflowY ||
        document.body.style.overflow ||
        bodyStyle.overflowY ||
        bodyStyle.overflow;
      const rootStyle = document.documentElement.style;
      const rootOverflow = rootStyle.overflowY || rootStyle.overflow;
      if ([overflow, rootOverflow].some((value) => /hidden|clip/.test(value))) {
        lenis?.stop();
      } else {
        lenis?.start();
      }
    };

    const syncMotion = () => {
      lenis?.destroy();
      lenis = undefined;
      if (motion.matches) return;

      lenis = new Lenis({
        autoRaf: true,
        wheelMultiplier: 0.6,
        lerp: 0.06,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        virtualScroll: (data) => {
          if (data.event.type === "wheel") {
            const clouds = document.querySelector<HTMLElement>(
              "[data-cloud-transition][data-scroll-start][data-scroll-end]",
            );
            if (clouds) {
              const start = Number(clouds.dataset.scrollStart);
              const end = Number(clouds.dataset.scrollEnd);
              const position = lenis?.targetScroll ?? window.scrollY;
              const width = end - start;
              const ramp = Math.min(width * 0.2, window.innerHeight * 0.18);
              if (ramp > 0) {
                // Integrate an eased entry/exit so even large or reversed wheel
                // inputs keep moving without a sudden change in resistance.
                const integral = (t: number) => t * t * t * (1 - t * 0.5);
                const slowedDistance = (at: number) => {
                  const x = at - start;
                  if (x <= 0) return 0;
                  if (x < ramp) return ramp * integral(x / ramp);
                  if (x <= width - ramp) return x - ramp * 0.5;
                  if (x < width)
                    return width - ramp - ramp * integral((width - x) / ramp);
                  return width - ramp;
                };
                data.deltaY -=
                  (slowedDistance(position + data.deltaY) -
                    slowedDistance(position)) *
                  0.65;
              }
            }
          }
          return true;
        },
        // Keep modal contents native, even while background scrolling is stopped.
        prevent: (element) => element.matches('dialog, [role="dialog"]'),
      });
      syncScrollLock();
    };

    // Preserve native anchor navigation, focus, history, and touch scrolling.
    syncMotion();
    motion.addEventListener("change", syncMotion);
    const observer = new MutationObserver(syncScrollLock);
    for (const element of [document.body, document.documentElement]) {
      observer.observe(element, {
        attributes: true,
        attributeFilter: ["style"],
      });
    }

    return () => {
      observer.disconnect();
      motion.removeEventListener("change", syncMotion);
      lenis?.destroy();
    };
  }, []);

  return null;
}
