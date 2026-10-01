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
        allowNestedScroll: true,
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
