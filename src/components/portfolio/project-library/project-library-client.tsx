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

    async function loadScene() {
      if (started) return;
      started = true;
      setStatus("loading");

      try {
        const { createLibraryScene } =
          await import("@/lib/three/create-library-scene");
        if (!alive) return;

        const controller = await createLibraryScene({
          host: host!,
          environmentUrl: prometheusLibrary.environmentUrl,
          books: prometheusLibrary.books,
          signal: abort.signal,
          reducedMotion: motionPreference.matches,
          coarsePointer: coarsePreference.matches,
          onDockedChange: (owned) => {
            if (alive) setDocked(owned);
          },
          onSelectionChange(bookId) {
            if (!alive) return;
            setSelected(bookId);
            if (bookId) {
              window.dispatchEvent(
                new CustomEvent("prometheus:open-furniture-odyssey", {
                  detail: { source: "library" },
                }),
              );
              queueMicrotask(() => controllerRef.current?.resetSelection());
            }
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

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        syncVisibility();
      },
      { threshold: 0.01 },
    );

    void loadScene();
    visibilityObserver.observe(host);
    motionPreference.addEventListener("change", motionChanged);
    coarsePreference.addEventListener("change", pointerChanged);
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      alive = false;
      abort.abort();
      visibilityObserver.disconnect();
      motionPreference.removeEventListener("change", motionChanged);
      coarsePreference.removeEventListener("change", pointerChanged);
      document.removeEventListener("visibilitychange", syncVisibility);
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [book.id]);

  const isSelected = selected === book.id;

  function toggleBook() {
    window.dispatchEvent(
      new CustomEvent("prometheus:open-furniture-odyssey", {
        detail: { source: "library-control" },
      }),
    );
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

        {status === "fallback" && (
          <div className={styles.overlay} role="status">
            <div className={styles.overlayContent}>
              <p className={styles.overlayEyebrow}>
                Library preview unavailable
              </p>
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
          Select Furniture Odyssey to open the interactive book reader.
        </p>
        <p className={styles.srOnly} role="status" aria-live="polite">
          {isSelected ? "Furniture Odyssey selected." : ""}
        </p>
      </div>
    </div>
  );
}
