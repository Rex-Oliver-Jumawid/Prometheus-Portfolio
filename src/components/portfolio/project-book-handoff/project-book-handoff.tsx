"use client";

import { useEffect, useRef } from "react";
import {
  bookEndpoints,
  HANDOFF,
  handoffProgress,
  subscribeBookEndpoints,
} from "@/lib/three/book-handoff";
import type { createBookHandoffLayer } from "@/lib/three/create-book-handoff-layer";
import styles from "./project-book-handoff.module.css";

export function ProjectBookHandoff() {
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const work = document.getElementById("work"),
      library = document.getElementById("library");
    const footer = document.getElementById("contact"),
      host = layerRef.current;
    if (!work || !library || !footer || !host) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      alive = true,
      loading = false,
      failed = false;
    let layer: ReturnType<typeof createBookHandoffLayer> | undefined;
    let displayed = 0,
      last = 0,
      recovering = false,
      hadTarget = false;
    function schedule() {
      if (!frame && alive) frame = requestAnimationFrame(update);
    }
    async function load() {
      if (loading || layer || failed) return;
      loading = true;
      try {
        const { createBookHandoffLayer } =
          await import("@/lib/three/create-book-handoff-layer");
        if (!alive) return;
        layer = createBookHandoffLayer(host!, () => {
          failed = true;
          schedule();
        });
      } catch {
        failed = true;
      } finally {
        loading = false;
        schedule();
      }
    }
    function update(now: number) {
      frame = 0;
      // Sum flow heights: pinned visual tops never enter the scroll timeline.
      let start = work!.parentElement!.getBoundingClientRect().top + scrollY;
      const starts = new Map<Element, number>();
      for (const section of work!.parentElement!.children) {
        if (section.tagName !== "SECTION") continue;
        starts.set(section, start);
        start += section.getBoundingClientRect().height;
      }
      const desired = handoffProgress(
        scrollY,
        starts.get(work!)!,
        starts.get(library!)!,
        innerHeight,
      );
      const { source, target } = bookEndpoints();
      const inCorridor =
        scrollY >= starts.get(work!)! && scrollY < starts.get(footer!)!;
      const ready = !!source && !!target && !!layer && !failed;
      if (source && !motion.matches) void load();
      if (ready && !hadTarget && desired > 0 && inCorridor) recovering = true;
      hadTarget = ready;
      if (motion.matches || failed) {
        recovering = false;
        displayed = desired >= 0.5 ? 1 : 0;
      } else if (recovering && ready && inCorridor) {
        const step =
          Math.min(0.05, Math.max(0, (now - last) / 1000)) /
          HANDOFF.recoverySeconds;
        displayed +=
          Math.sign(desired - displayed) *
          Math.min(step, Math.abs(desired - displayed));
        if (displayed === desired) recovering = false;
      } else {
        recovering = false;
        displayed = ready ? desired : 0;
      }
      last = now;
      const travel =
        !!source &&
        !!layer &&
        !failed &&
        inCorridor &&
        !motion.matches &&
        desired > 0 &&
        displayed < 1;
      const docked =
        !!target &&
        (motion.matches || failed || !source
          ? desired >= 0.5
          : displayed === 1 || (!inCorridor && desired === 1));
      if (travel) {
        try {
          const sourceView = source!.view();
          layer!.render(sourceView, target?.view() ?? sourceView, displayed);
        } catch {
          failed = true;
          schedule();
          return;
        }
      }
      source?.own(!travel && !docked);
      target?.own(docked, source ? displayed : docked ? 1 : 0);
      host!.dataset.visible = String(travel && !document.hidden);
      // The footer can enter before its flow start. Clip to its actual top.
      const top = Math.max(0, work!.getBoundingClientRect().top);
      const bottom = Math.max(
        0,
        innerHeight - footer!.getBoundingClientRect().top,
      );
      host!.style.clipPath = `inset(${top}px 0 ${bottom}px 0)`;
      host!.dataset.owner = travel ? "handoff" : docked ? "shelf" : "source";
      host!.dataset.progress = String(displayed);
      if (recovering) schedule();
    }
    const unsubscribe = subscribeBookEndpoints(schedule),
      observer = new ResizeObserver(schedule);
    [work, library, footer].forEach((section) => observer.observe(section));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", schedule);
    schedule();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      unsubscribe();
      observer.disconnect();
      layer?.dispose();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, []);
  return (
    <div
      ref={layerRef}
      className={styles.handoff}
      data-testid="book-handoff"
      aria-hidden="true"
    />
  );
}
