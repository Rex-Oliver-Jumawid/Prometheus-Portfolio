"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MIN_SECTION_SCROLL_MS = 1450;
const MAX_SECTION_SCROLL_MS = 2400;
const SECTION_SCROLL_MS_PER_PIXEL = 0.55;

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function StickyViewports({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sections = Array.from(root.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element.tagName === "SECTION",
    );
    const positions = new Map<
      string,
      { section: HTMLElement; start: number; height: number }
    >();

    let frame: number | undefined;
    let scrollFrame: number | undefined;
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    function measure() {
      let start = root!.getBoundingClientRect().top + window.scrollY;
      sections.forEach((section, index) => {
        const height = section.getBoundingClientRect().height;
        section.style.setProperty(
          "--viewport-top",
          `${section.dataset.viewportPin === "top" ? 0 : Math.min(0, window.innerHeight - height)}px`,
        );
        section.style.setProperty("--viewport-order", String(index + 1));
        positions.set(section.id, { section, start, height });
        section.dataset.viewportStart = String(start);
        section.dataset.viewportHeight = String(height);
        start += height;
      });
      root!.dataset.stickyReady = "true";
    }

    function sectionTarget(id: string) {
      measure();
      const position = positions.get(id);
      if (!position) return null;

      const { section, start, height } = position;
      const titleId = section.getAttribute("aria-labelledby");
      const title = titleId
        ? document.getElementById(titleId)
        : section.querySelector("h1, h2");
      const titleBottom = title
        ? title.getBoundingClientRect().bottom -
          section.getBoundingClientRect().top
        : 0;
      const offset = Math.min(
        Math.max(0, height - window.innerHeight),
        Math.max(0, titleBottom + 24 - window.innerHeight),
      );

      return start + offset;
    }

    function animateScrollTo(target: number) {
      window.cancelAnimationFrame(scrollFrame ?? 0);

      const start = window.scrollY;
      const distance = target - start;
      if (Math.abs(distance) < 1) {
        window.scrollTo(0, target);
        return;
      }

      const duration = Math.min(
        MAX_SECTION_SCROLL_MS,
        Math.max(
          MIN_SECTION_SCROLL_MS,
          Math.abs(distance) * SECTION_SCROLL_MS_PER_PIXEL,
        ),
      );
      const startedAt = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startedAt;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeInOutCubic(progress);
        window.scrollTo(0, start + distance * eased);

        if (progress < 1) {
          scrollFrame = window.requestAnimationFrame(tick);
        } else {
          scrollFrame = undefined;
        }
      };

      scrollFrame = window.requestAnimationFrame(tick);
    }

    function navigate(id: string, behavior: "instant" | "smooth") {
      if (!positions.has(id)) return;
      window.cancelAnimationFrame(frame ?? 0);
      window.cancelAnimationFrame(scrollFrame ?? 0);

      frame = window.requestAnimationFrame(() => {
        const target = sectionTarget(id);
        if (target === null) return;

        if (
          behavior === "instant" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          window.scrollTo(0, target);
          return;
        }

        animateScrollTo(target);
      });
    }

    function hashChanged() {
      navigate(
        window.location.hash.slice(1),
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      );
    }

    function clicked(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;

      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;

      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target ||
        link.hasAttribute("download")
      )
        return;

      const url = new URL(link.href);
      const current = window.location;
      if (
        url.origin !== current.origin ||
        url.pathname !== current.pathname ||
        url.search !== current.search
      )
        return;

      navigate(
        url.hash.slice(1),
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      );
    }

    const navigationEntry = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    const isReload = navigationEntry?.type === "reload";

    if (isReload) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      window.scrollTo(0, 0);
    }

    measure();

    const observer = new ResizeObserver(measure);
    sections.forEach((section) => observer.observe(section));
    window.addEventListener("resize", measure);
    window.addEventListener("hashchange", hashChanged);
    document.addEventListener("click", clicked);

    if (isReload) {
      frame = window.requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
      });
    } else {
      navigate(window.location.hash.slice(1), "instant");
    }

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame ?? 0);
      window.cancelAnimationFrame(scrollFrame ?? 0);
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener("resize", measure);
      window.removeEventListener("hashchange", hashChanged);
      document.removeEventListener("click", clicked);
      delete root.dataset.stickyReady;
      sections.forEach((section) => {
        section.style.removeProperty("--viewport-top");
        section.style.removeProperty("--viewport-order");
        delete section.dataset.viewportStart;
        delete section.dataset.viewportHeight;
      });
    };
  }, []);

  return (
    <main ref={rootRef} className="viewport-stack">
      {children}
    </main>
  );
}
