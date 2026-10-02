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
  const sourceSnapshotRef = useRef<Bounds | null>(null);
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

      if (progress <= 0.001) {
        sourceSnapshotRef.current = null;
      } else if (!sourceSnapshotRef.current && sourceRef.current) {
        sourceSnapshotRef.current = { ...sourceRef.current };
      }

      const sourceOpacity = reducedMotion.matches
        ? progress < 0.5
          ? 1
          : 0
        : 1 - smooth(progress / 0.018);
      work.style.setProperty(
        "--book-handoff-source-opacity",
        String(sourceOpacity),
      );

      const source = sourceSnapshotRef.current ?? sourceRef.current;
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
      const sourceCenter = {
        x: source.left + source.width / 2,
        y: source.top + source.height / 2,
      };
      const targetCenter = {
        x: target.left + target.width / 2,
        y: target.top + target.height / 2,
      };
      const controlOne = {
        x: mix(sourceCenter.x, targetCenter.x, 0.24),
        y: sourceCenter.y - window.innerHeight * 0.085,
      };
      const controlTwo = {
        x: mix(sourceCenter.x, targetCenter.x, 0.78),
        y: targetCenter.y - window.innerHeight * 0.12,
      };
      const inverse = 1 - travel;
      const centerX =
        inverse ** 3 * sourceCenter.x +
        3 * inverse ** 2 * travel * controlOne.x +
        3 * inverse * travel ** 2 * controlTwo.x +
        travel ** 3 * targetCenter.x;
      const centerY =
        inverse ** 3 * sourceCenter.y +
        3 * inverse ** 2 * travel * controlOne.y +
        3 * inverse * travel ** 2 * controlTwo.y +
        travel ** 3 * targetCenter.y;

      const sizeTravel = smooth(clamp01((progress - 0.08) / 0.88));
      const width = mix(source.width, target.width, sizeTravel);
      const height = mix(source.height, target.height, sizeTravel);
      const left = centerX - width / 2;
      const top = centerY - height / 2;
      const rotation = mix(-4, 0, smooth(progress));
      const tilt = Math.sin(Math.PI * travel) * -7;
      const fadeOut = 1 - smooth((progress - 0.968) / 0.032);
      const fadeIn = smooth(progress / 0.018);
      const glow = Math.sin(Math.PI * travel);

      overlay.style.setProperty("--handoff-x", `${left}px`);
      overlay.style.setProperty("--handoff-y", `${top}px`);
      overlay.style.setProperty("--handoff-width", `${width}px`);
      overlay.style.setProperty("--handoff-height", `${height}px`);
      overlay.style.setProperty("--handoff-rotation", `${rotation}deg`);
      overlay.style.setProperty("--handoff-tilt", `${tilt}deg`);
      overlay.style.setProperty("--handoff-glow", String(glow));
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
