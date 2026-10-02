"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { furnitureOdyssey } from "@/content/projects";

import styles from "./project-book-handoff.module.css";

type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smooth(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

export function ProjectBookHandoff() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<Bounds | null>(null);
  const targetRef = useRef<Bounds | null>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const work = document.getElementById("work");
    const library = document.getElementById("library");
    if (!overlay || !work || !library) return;

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

      const libraryRect = library.getBoundingClientRect();
      const startTop = window.innerHeight * 0.94;
      const endTop = window.innerHeight * 0.16;
      const rawProgress = clamp01(
        (startTop - libraryRect.top) / Math.max(1, startTop - endTop),
      );
      const progress = smooth(rawProgress);

      publishProgress(progress);

      const sourceOpacity = reducedMotion.matches
        ? progress < 0.5
          ? 1
          : 0
        : 1 - smooth(progress / 0.14);
      work.style.setProperty(
        "--book-handoff-source-opacity",
        String(sourceOpacity),
      );

      const source = sourceRef.current;
      const target = targetRef.current;
      if (
        reducedMotion.matches ||
        !source ||
        !target ||
        progress <= 0 ||
        progress >= 1
      ) {
        overlay.dataset.visible = "false";
        return;
      }

      const travel = smooth(progress);
      const arc = -Math.sin(Math.PI * travel) * window.innerHeight * 0.045;
      const left = mix(source.left, target.left, travel);
      const top = mix(source.top, target.top, travel) + arc;
      const width = mix(source.width, target.width, travel);
      const height = mix(source.height, target.height, travel);
      const rotation = mix(-4, 0, travel);
      const fadeOut = 1 - smooth((progress - 0.88) / 0.12);
      const fadeIn = smooth(progress / 0.06);

      overlay.style.setProperty("--handoff-x", `${left}px`);
      overlay.style.setProperty("--handoff-y", `${top}px`);
      overlay.style.setProperty("--handoff-width", `${width}px`);
      overlay.style.setProperty("--handoff-height", `${height}px`);
      overlay.style.setProperty("--handoff-rotation", `${rotation}deg`);
      overlay.style.setProperty(
        "--handoff-opacity",
        String(fadeIn * fadeOut),
      );
      overlay.dataset.visible = "true";
    }

    function schedule() {
      if (frame === undefined) frame = window.requestAnimationFrame(update);
    }

    function sourceChanged(event: Event) {
      sourceRef.current = (event as CustomEvent<Bounds>).detail;
      schedule();
    }

    function targetChanged(event: Event) {
      targetRef.current = (event as CustomEvent<Bounds>).detail;
      schedule();
    }

    function motionChanged() {
      schedule();
    }

    document.addEventListener("prometheus:book-source-bounds", sourceChanged);
    document.addEventListener("prometheus:book-target-bounds", targetChanged);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", motionChanged);

    document.dispatchEvent(new Event("prometheus:book-bounds-request"));
    schedule();

    return () => {
      window.cancelAnimationFrame(frame ?? 0);
      document.removeEventListener(
        "prometheus:book-source-bounds",
        sourceChanged,
      );
      document.removeEventListener(
        "prometheus:book-target-bounds",
        targetChanged,
      );
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", motionChanged);
      work.style.removeProperty("--book-handoff-source-opacity");
      publishProgress(1);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className={styles.handoff}
      data-visible="false"
      aria-hidden="true"
    >
      <Image
        src={furnitureOdyssey.coverUrl}
        alt=""
        fill
        sizes="100vw"
        unoptimized
        priority={false}
      />
    </div>
  );
}
