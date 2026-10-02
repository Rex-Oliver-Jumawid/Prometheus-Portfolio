"use client";

import { useEffect, useRef, useState } from "react";

import { prometheusLibrary, type LibraryBook } from "@/content/library";
import type { LibraryScene } from "@/lib/three/create-library-scene";

import styles from "./project-library.module.css";

type Status = "idle" | "loading" | "ready" | "fallback";

export function ProjectLibraryClient() {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<LibraryScene | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [loadingLabel, setLoadingLabel] = useState("Preparing the bookshelf...");
  const [selected, setSelected] = useState<LibraryBook["id"] | null>(null);
  const [hovered, setHovered] = useState<LibraryBook["id"] | null>(null);
  const [docked, setDocked] = useState(false);
  const book = prometheusLibrary.books[0];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const abort = new AbortController();
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const coarsePreference = window.matchMedia("(pointer: coarse)");
    let alive = true;
    let started = false;
    let active = false;

    function syncVisibility() {
      controllerRef.current?.setVisible(active && !document.hidden);
    }

    function publishBookBounds() {
      const bounds = controllerRef.current?.getBookBounds(book.id);
      if (!bounds?.width || !bounds.height) return;

      document.dispatchEvent(
        new CustomEvent("prometheus:book-target-bounds", {
          detail: bounds,
        }),
      );
    }

    function handoffChanged(event: Event) {
      const progress = (event as CustomEvent<{ progress: number }>).detail
        ?.progress;
      if (typeof progress !== "number") return;
      controllerRef.current?.setDockProgress(progress);
      setDocked(progress >= 0.995);
      window.requestAnimationFrame(publishBookBounds);
    }

    async function loadScene() {
      if (started) return;
      started = true;
      setStatus("loading");

      try {
        const { createLibraryScene } = await import(
          "@/lib/three/create-library-scene"
        );
        if (!alive) return;

        const controller = await createLibraryScene({
          host,
          environmentUrl: prometheusLibrary.environmentUrl,
          books: prometheusLibrary.books,
          signal: abort.signal,
          reducedMotion: motionPreference.matches,
          coarsePointer: coarsePreference.matches,
          onProgress(nextProgress, label) {
            if (!alive) return;
            setProgress(nextProgress);
            setLoadingLabel(label);
          },
          onSelectionChange(bookId) {
            if (alive) setSelected(bookId);
          },
          onHoverChange(bookId) {
            if (alive) setHovered(bookId);
          },
          onContextLost() {
            if (alive) setStatus("fallback");
          },
        });

        if (!alive) {
          controller.dispose();
          return;
        }

        controllerRef.current = controller;
        controller.setVisible(active && !document.hidden);
        window.requestAnimationFrame(publishBookBounds);
        document.dispatchEvent(new Event("prometheus:book-bounds-request"));
        setProgress(100);
        setStatus("ready");
      } catch (error) {
        if (
          alive &&
          !abort.signal.aborted &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          console.error("[Prometheus library]", error);
          setStatus("fallback");
        }
      }
    }

    function motionChanged() {
      controllerRef.current?.setReducedMotion(motionPreference.matches);
    }

    function pointerChanged() {
      controllerRef.current?.setCoarsePointer(coarsePreference.matches);
    }

    const nearObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadScene();
          nearObserver.disconnect();
        }
      },
      { rootMargin: "1000px" },
    );

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        syncVisibility();
      },
      { threshold: 0.01 },
    );

    nearObserver.observe(host);
    visibilityObserver.observe(host);
    motionPreference.addEventListener("change", motionChanged);
    coarsePreference.addEventListener("change", pointerChanged);
    document.addEventListener("visibilitychange", syncVisibility);
    document.addEventListener("prometheus:book-bounds-request", publishBookBounds);
    document.addEventListener("prometheus:book-handoff-progress", handoffChanged);
    window.addEventListener("scroll", publishBookBounds, { passive: true });
    window.addEventListener("resize", publishBookBounds);

    return () => {
      alive = false;
      abort.abort();
      nearObserver.disconnect();
      visibilityObserver.disconnect();
      motionPreference.removeEventListener("change", motionChanged);
      coarsePreference.removeEventListener("change", pointerChanged);
      document.removeEventListener("visibilitychange", syncVisibility);
      document.removeEventListener(
        "prometheus:book-bounds-request",
        publishBookBounds,
      );
      document.removeEventListener(
        "prometheus:book-handoff-progress",
        handoffChanged,
      );
      window.removeEventListener("scroll", publishBookBounds);
      window.removeEventListener("resize", publishBookBounds);
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [book.id]);

  const isSelected = selected === book.id;

  function toggleBook() {
    if (isSelected) controllerRef.current?.resetSelection();
    else controllerRef.current?.selectBook(book.id);
  }

  return (
    <div className={styles.experience}>
      <div
        className={styles.stage}
        aria-label="Interactive antique bookshelf"
        aria-describedby="library-instructions"
        aria-busy={status === "loading"}
      >
        <div ref={hostRef} className={styles.canvasHost} aria-hidden="true" />

        {(status === "idle" || status === "loading") && (
          <div className={styles.overlay} role="status" aria-live="polite">
            <div className={styles.overlayContent}>
              <p className={styles.overlayEyebrow}>Opening the library</p>
              <p className={styles.overlayTitle}>{loadingLabel}</p>
              <progress
                className={styles.progress}
                max={100}
                value={progress}
                aria-label="Library loading progress"
              />
            </div>
          </div>
        )}

        {status === "fallback" && (
          <div className={styles.overlay} role="status">
            <div className={styles.overlayContent}>
              <p className={styles.overlayEyebrow}>Library preview unavailable</p>
              <p className={styles.fallbackText}>
                The interactive shelf could not load in this browser.
              </p>
            </div>
          </div>
        )}

        <button
          className={styles.bookControl}
          data-active={isSelected}
          data-hovered={hovered === book.id}
          type="button"
          disabled={status !== "ready" || !docked}
          aria-pressed={isSelected}
          onClick={toggleBook}
          onPointerEnter={() => controllerRef.current?.setHovered(book.id)}
          onPointerLeave={() => controllerRef.current?.setHovered(null)}
          onFocus={() => controllerRef.current?.setHovered(book.id)}
          onBlur={() => controllerRef.current?.setHovered(null)}
        >
          <span>{book.category}</span>
          <strong>
            {isSelected ? "Return Furniture Odyssey to shelf" : book.title}
          </strong>
        </button>

        <p id="library-instructions" className={styles.srOnly}>
          Select Furniture Odyssey to pull it forward from the shelf. Select it
          again to return it.
        </p>
        <p className={styles.srOnly} role="status" aria-live="polite">
          {isSelected ? "Furniture Odyssey selected." : ""}
        </p>
      </div>
    </div>
  );
}
