"use client";

import { useEffect, useRef, type ReactNode } from "react";

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

    function measure() {
      let start = root!.getBoundingClientRect().top + window.scrollY;
      sections.forEach((section, index) => {
        const height = section.getBoundingClientRect().height;
        // Let taller panels scroll through their content before pinning their bottom edge.
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

    function navigate(id: string, behavior: ScrollBehavior) {
      if (!positions.has(id)) return;
      window.cancelAnimationFrame(frame ?? 0);
      frame = window.requestAnimationFrame(() => {
        measure();
        const { section, start, height } = positions.get(id)!;
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
        // Sticky boxes keep their visual position; anchor navigation needs their flow position.
        window.scrollTo({ top: start + offset, behavior });
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

    measure();
    const observer = new ResizeObserver(measure);
    sections.forEach((section) => observer.observe(section));
    window.addEventListener("resize", measure);
    window.addEventListener("hashchange", hashChanged);
    document.addEventListener("click", clicked);
    navigate(window.location.hash.slice(1), "instant");

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame ?? 0);
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
