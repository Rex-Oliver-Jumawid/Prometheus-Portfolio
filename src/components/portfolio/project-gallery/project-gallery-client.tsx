"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { BookPage, PortfolioProject } from "@/content/projects";
import type { GalleryScene } from "@/lib/three/create-gallery-scene";

import styles from "./project-gallery.module.css";

type PageTurn = {
  from: number;
  to: number;
  direction: -1 | 1;
  scrollTop: number;
};

function BookPageContent({ page }: { page?: BookPage }) {
  return page ? (
    <>
      <p className={styles.eyebrow}>{page.label}</p>
      <h3>{page.title}</h3>
      {page.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </>
  ) : null;
}

export function ProjectGalleryClient({
  project,
}: {
  project: PortfolioProject;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const restoreFocusRef = useRef(false);
  const controllerRef = useRef<GalleryScene | null>(null);
  const handoffTargetRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const handoffSourceRef = useRef<{
    host: DOMRect;
    book: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const readerPhaseRef = useRef<"closed" | "opening" | "open" | "closing">(
    "closed",
  );
  const [readerPhase, setReaderPhase] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<PageTurn | null>(null);
  const turnRef = useRef<PageTurn | null>(null);
  const finishTurn = useCallback(() => {
    const pending = turnRef.current;
    if (!pending) return;
    turnRef.current = null;
    setSpread(pending.to);
    setTurn(null);
  }, []);
  const positionReader = useCallback(() => {
    const source =
      controllerRef.current?.getBookBounds() ??
      posterRef.current?.getBoundingClientRect();
    const stage = stageRef.current;
    const viewport = stage?.parentElement?.getBoundingClientRect();
    const dialog = dialogRef.current;
    if (
      !source?.width ||
      !source.height ||
      !stage?.offsetWidth ||
      !stage.offsetHeight ||
      !viewport ||
      !dialog
    )
      return;
    const pose = controllerRef.current?.getCoverPose() ?? {
      topLeft: { x: source.left, y: source.top },
      topRight: { x: source.left + source.width, y: source.top },
      bottomLeft: { x: source.left, y: source.top + source.height },
    };
    const width = stage.offsetWidth;
    const height = stage.offsetHeight;
    const left = viewport.left + (viewport.width - width) / 2;
    const top = viewport.top + (viewport.height - height) / 2;
    const a = (pose.topRight.x - pose.topLeft.x) / (width / 2);
    const b = (pose.topRight.y - pose.topLeft.y) / (width / 2);
    const c = (pose.bottomLeft.x - pose.topLeft.x) / height;
    const d = (pose.bottomLeft.y - pose.topLeft.y) / height;
    const x = pose.topLeft.x - left - (a * width) / 2;
    const y = pose.topLeft.y - top - (b * width) / 2;
    dialog.style.setProperty(
      "--book-rest-transform",
      `matrix(${a}, ${b}, ${c}, ${d}, ${x}, ${y})`,
    );
  }, []);
  const openBook = useCallback(() => {
    if (readerPhaseRef.current !== "closed") return;
    setSpread(0);
    dialogRef.current?.showModal();
    dialogRef.current
      ?.querySelector<HTMLElement>("article")
      ?.focus({ preventScroll: true });
    positionReader();
    const phase = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "open"
      : "opening";
    readerPhaseRef.current = phase;
    setReaderPhase(phase);
    controllerRef.current?.setPaused(true);
    controllerRef.current?.setVisible(false);
  }, [positionReader]);
  const finishClose = useCallback(() => {
    if (readerPhaseRef.current === "closed") return;
    finishTurn();
    readerPhaseRef.current = "closed";
    setReaderPhase("closed");
    restoreFocusRef.current = true;
    if (dialogRef.current?.open) dialogRef.current.close();
    controllerRef.current?.setPaused(false);
    hostRef.current?.dispatchEvent(new Event("gallery-motion-change"));
  }, [finishTurn]);
  const closeBook = useCallback(() => {
    if (
      readerPhaseRef.current === "closed" ||
      readerPhaseRef.current === "closing"
    )
      return;
    finishTurn();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishClose();
      return;
    }
    positionReader();
    readerPhaseRef.current = "closing";
    setReaderPhase("closing");
    hostRef.current?.dispatchEvent(new Event("gallery-motion-change"));
  }, [finishClose, finishTurn, positionReader]);

  useEffect(() => {
    if (!turn) return;
    const timer = window.setTimeout(finishTurn, 700);
    return () => window.clearTimeout(timer);
  }, [turn, finishTurn]);

  const readerActive = readerPhase !== "closed";
  useEffect(() => {
    if (readerPhase !== "opening" && readerPhase !== "closing") return;
    const timer = window.setTimeout(
      () => {
        if (readerPhase === "closing") finishClose();
        else {
          readerPhaseRef.current = "open";
          setReaderPhase("open");
        }
      },
      readerPhase === "opening" ? 1200 : 750,
    );
    return () => window.clearTimeout(timer);
  }, [readerPhase, finishClose]);
  useEffect(() => {
    if (!readerActive) return;
    // Lock the viewport, not a section ancestor: body overflow breaks sticky panels
    // when Lenis also clips the root while stopped.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [readerActive]);
  useEffect(() => {
    if (readerPhase === "closed" && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      hostRef.current?.focus({ preventScroll: true });
    }
  }, [readerPhase]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const abort = new AbortController();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let active = false;
    let started = false;
    let alive = true;

    let boundsFrame: number | undefined;

    function publishBookBounds() {
      const source =
        controllerRef.current?.getBookBounds() ??
        posterRef.current?.getBoundingClientRect();
      if (!source?.width || !source.height) return;

      document.dispatchEvent(
        new CustomEvent("prometheus:book-source-bounds", {
          detail: {
            left: source.left,
            top: source.top,
            width: source.width,
            height: source.height,
          },
        }),
      );
    }

    function queueBookBounds() {
      window.cancelAnimationFrame(boundsFrame ?? 0);
      boundsFrame = window.requestAnimationFrame(publishBookBounds);
    }

    function resetHandoffCanvas() {
      const canvas =
        host?.querySelector("canvas") ??
        document.body.querySelector<HTMLCanvasElement>(
          'canvas[data-prometheus-handoff="true"]',
        );
      if (!canvas || !host) return;

      if (canvas.parentElement !== host) host.append(canvas);
      canvas.style.removeProperty("position");
      canvas.style.removeProperty("inset");
      canvas.style.removeProperty("left");
      canvas.style.removeProperty("top");
      canvas.style.removeProperty("width");
      canvas.style.removeProperty("height");
      canvas.style.removeProperty("z-index");
      canvas.style.removeProperty("pointer-events");
      canvas.style.removeProperty("transform");
      canvas.style.removeProperty("transform-origin");
      canvas.style.removeProperty("opacity");
      canvas.style.removeProperty("filter");
    }

    function targetBoundsChanged(event: Event) {
      handoffTargetRef.current = (
        event as CustomEvent<{
          left: number;
          top: number;
          width: number;
          height: number;
        }>
      ).detail;
    }

    function handoffChanged(event: Event) {
      const progress = (event as CustomEvent<{ progress: number }>).detail
        ?.progress;
      const controller = controllerRef.current;
      const canvas =
        host?.querySelector("canvas") ??
        document.body.querySelector<HTMLCanvasElement>(
          'canvas[data-prometheus-handoff="true"]',
        );

      if (typeof progress !== "number" || !controller || !canvas || !host) return;

      if (progress <= 0.001) {
        handoffSourceRef.current = null;
        canvas.removeAttribute("data-prometheus-handoff");
        resetHandoffCanvas();
        return;
      }

      if (progress >= 0.998) {
        canvas.removeAttribute("data-prometheus-handoff");
        resetHandoffCanvas();
        handoffSourceRef.current = null;
        return;
      }

      if (!handoffSourceRef.current) {
        const book = controller.getBookBounds();
        const hostRect = host.getBoundingClientRect();
        if (!book?.width || !book.height || !hostRect.width || !hostRect.height) {
          return;
        }

        handoffSourceRef.current = {
          host: hostRect,
          book: {
            left: book.left,
            top: book.top,
            width: book.width,
            height: book.height,
          },
        };
      }

      const source = handoffSourceRef.current;
      const target = handoffTargetRef.current;
      if (!source || !target?.width || !target.height) return;

      if (canvas.parentElement !== document.body) {
        document.body.append(canvas);
      }
      canvas.dataset.prometheusHandoff = "true";

      const travel = progress * progress * (3 - 2 * progress);
      const sourceCenterX = source.book.left + source.book.width / 2;
      const sourceCenterY = source.book.top + source.book.height / 2;
      const targetCenterX = target.left + target.width / 2;
      const targetCenterY = target.top + target.height / 2;

      const controlOneX = sourceCenterX + (targetCenterX - sourceCenterX) * 0.24;
      const controlOneY = sourceCenterY - window.innerHeight * 0.08;
      const controlTwoX = sourceCenterX + (targetCenterX - sourceCenterX) * 0.78;
      const controlTwoY = targetCenterY - window.innerHeight * 0.105;
      const inverse = 1 - travel;

      const centerX =
        inverse ** 3 * sourceCenterX +
        3 * inverse ** 2 * travel * controlOneX +
        3 * inverse * travel ** 2 * controlTwoX +
        travel ** 3 * targetCenterX;
      const centerY =
        inverse ** 3 * sourceCenterY +
        3 * inverse ** 2 * travel * controlOneY +
        3 * inverse * travel ** 2 * controlTwoY +
        travel ** 3 * targetCenterY;

      const targetScale = Math.min(
        target.width / source.book.width,
        target.height / source.book.height,
      );
      const sizeProgress = Math.min(
        1,
        Math.max(0, (progress - 0.12) / 0.86),
      );
      const easedSize = sizeProgress * sizeProgress * (3 - 2 * sizeProgress);
      const scale = 1 + (targetScale - 1) * easedSize;

      const localBookCenterX =
        source.book.left - source.host.left + source.book.width / 2;
      const localBookCenterY =
        source.book.top - source.host.top + source.book.height / 2;

      const translateX =
        centerX - source.host.left - localBookCenterX * scale;
      const translateY =
        centerY - source.host.top - localBookCenterY * scale;

      canvas.style.position = "fixed";
      canvas.style.inset = "auto";
      canvas.style.left = `${source.host.left}px`;
      canvas.style.top = `${source.host.top}px`;
      canvas.style.width = `${source.host.width}px`;
      canvas.style.height = `${source.host.height}px`;
      canvas.style.zIndex = "90";
      canvas.style.pointerEvents = "none";
      canvas.style.transformOrigin = "0 0";
      canvas.style.transform =
        `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
      canvas.style.opacity = "1";
      canvas.style.filter =
        "drop-shadow(0 14px 28px rgb(0 0 0 / 34%)) drop-shadow(0 0 18px rgb(232 179 72 / 20%))";
    }

    function syncScroll() {
      const section = host!.closest("section") ?? host!;
      const top = section.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, 1 - top / window.innerHeight));
      controllerRef.current?.setScrollProgress(progress);
      queueBookBounds();
    }
    function syncVisibility() {
      const visible =
        active &&
        !document.hidden &&
        (readerPhaseRef.current === "closed" ||
          readerPhaseRef.current === "closing");
      controllerRef.current?.setVisible(visible);
    }
    async function loadScene() {
      if (started) return;
      started = true;
      try {
        const { createGalleryScene } =
          await import("@/lib/three/create-gallery-scene");
        if (!alive) return;
        const controller = await createGalleryScene({
          host: host!,
          bookUrl: project.modelUrl,
          signal: abort.signal,
          reducedMotion: preference.matches,
          onOpen: openBook,
          onContextLost: () => {
            if (alive) setStatus("fallback");
          },
        });
        if (!alive) {
          controller.dispose();
          return;
        }
        controllerRef.current = controller;
        controller.setPaused(readerPhaseRef.current !== "closed");
        controller.setReducedMotion(preference.matches);
        syncScroll();
        syncVisibility();
        queueBookBounds();
        setStatus("ready");
      } catch {
        if (alive && !abort.signal.aborted) setStatus("fallback");
      }
    }
    function motionChanged() {
      controllerRef.current?.setReducedMotion(preference.matches);
      if (preference.matches) {
        finishTurn();
        if (readerPhaseRef.current === "closing") finishClose();
        else if (readerPhaseRef.current === "opening") {
          readerPhaseRef.current = "open";
          setReaderPhase("open");
        }
      }
      syncVisibility();
    }
    motionChanged();
    const nearObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadScene();
          nearObserver.disconnect();
        }
      },
      { rootMargin: "250px" },
    );
    const visibilityObserver = new IntersectionObserver((entries) => {
      active = entries[0].isIntersecting;
      syncVisibility();
    });
    nearObserver.observe(host);
    visibilityObserver.observe(host);
    preference.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", syncVisibility);
    document.addEventListener("prometheus:book-bounds-request", queueBookBounds);
    document.addEventListener(
      "prometheus:book-target-bounds",
      targetBoundsChanged,
    );
    document.addEventListener(
      "prometheus:book-handoff-progress",
      handoffChanged,
    );
    host.addEventListener("gallery-motion-change", syncVisibility);
    window.addEventListener("scroll", syncScroll, { passive: true });
    window.addEventListener("resize", syncScroll);
    return () => {
      alive = false;
      abort.abort();
      nearObserver.disconnect();
      visibilityObserver.disconnect();
      preference.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", syncVisibility);
      document.removeEventListener(
        "prometheus:book-bounds-request",
        queueBookBounds,
      );
      document.removeEventListener(
        "prometheus:book-target-bounds",
        targetBoundsChanged,
      );
      document.removeEventListener(
        "prometheus:book-handoff-progress",
        handoffChanged,
      );
      resetHandoffCanvas();
      host.removeEventListener("gallery-motion-change", syncVisibility);
      window.removeEventListener("scroll", syncScroll);
      window.removeEventListener("resize", syncScroll);
      window.cancelAnimationFrame(boundsFrame ?? 0);
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [project.modelUrl, openBook, finishClose, finishTurn]);

  const lastSpread = Math.ceil(project.pages.length / 2) - 1;
  function turnPage(direction: -1 | 1) {
    const to = spread + direction;
    if (
      readerPhaseRef.current !== "open" ||
      turnRef.current ||
      to < 0 ||
      to > lastSpread
    )
      return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSpread(to);
      return;
    }
    const side = direction === 1 ? "right" : "left";
    const page = stageRef.current?.querySelector<HTMLElement>(
      `.${styles.spread} > article[data-side="${side}"]`,
    );
    const pending: PageTurn = {
      from: spread,
      to,
      direction,
      scrollTop: page?.scrollTop ?? 0,
    };
    turnRef.current = pending;
    setTurn(pending);
  }
  const leftIndex = turn?.direction === -1 ? turn.to * 2 : spread * 2;
  const rightIndex = turn?.direction === 1 ? turn.to * 2 + 1 : spread * 2 + 1;
  const frontIndex = turn ? turn.from * 2 + (turn.direction === 1 ? 1 : 0) : 0;
  const backIndex = turn ? turn.to * 2 + (turn.direction === 1 ? 0 : 1) : 0;

  return (
    <>
      {(status !== "loading" || readerActive) && (
        <link
          rel="preload"
          as="image"
          href={project.readerCover.url}
          fetchPriority="low"
        />
      )}
      <div
        className={styles.fallback}
        data-hidden={status === "ready"}
        data-reading={readerActive}
        aria-hidden="true"
      >
        <Image
          ref={posterRef}
          className={styles.bookPoster}
          src={project.coverUrl}
          alt=""
          width={1120}
          height={1440}
          unoptimized
        />
      </div>
      <div
        ref={hostRef}
        className={styles.canvas}
        data-visible={status === "ready"}
        data-reading={readerActive}
        role="button"
        tabIndex={0}
        aria-label={`Read ${project.title}`}
        aria-describedby="book-keyboard-hint"
        aria-haspopup="dialog"
        onClick={() => {
          if (status !== "ready") openBook();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openBook();
          } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            controllerRef.current?.rotate(event.key === "ArrowLeft" ? -1 : 1);
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            controllerRef.current?.tilt(event.key === "ArrowUp" ? -1 : 1);
          }
        }}
      />
      <p className={styles.srOnly} role="status">
        {status === "ready"
          ? "Interactive book ready."
          : status === "fallback"
            ? "3D view unavailable. You can still open and read the book."
            : "Loading 3D book."}
      </p>
      <p id="book-keyboard-hint" className={styles.srOnly}>
        Focus the book and press Enter to read, or use the left and right arrow
        keys to turn it and the up and down keys to tilt it. Scroll down to
        enlarge the floating book; scroll up to shrink it.
      </p>
      <dialog
        ref={dialogRef}
        className={styles.reader}
        data-phase={readerPhase}
        data-turning={!!turn}
        style={
          {
            "--book-spread-aspect":
              (2 * project.readerCover.width) / project.readerCover.height,
          } as CSSProperties
        }
        aria-labelledby="reader-title"
        aria-describedby="reader-close-hint"
        onCancel={(event) => {
          event.preventDefault();
          closeBook();
        }}
        onClose={finishClose}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            turnPage(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        onClick={(event) => {
          if (
            event.target instanceof Node &&
            !stageRef.current?.contains(event.target)
          )
            closeBook();
        }}
      >
        <p id="reader-close-hint" className={styles.srOnly}>
          Press Escape or click outside the book to close.
        </p>
        <div className={styles.readerContent}>
          <div className={styles.readerHeader}>
            <div>
              <p className={styles.eyebrow}>
                Prometheus · sample reading pages
              </p>
              <h2 id="reader-title">{project.title}</h2>
            </div>
          </div>
          <div className={styles.bookViewport}>
            <div
              ref={stageRef}
              className={styles.bookStage}
              onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget) return;
                if (readerPhaseRef.current === "closing") finishClose();
                else if (readerPhaseRef.current === "opening") {
                  readerPhaseRef.current = "open";
                  setReaderPhase("open");
                }
              }}
            >
              <div className={styles.spread} aria-busy={!!turn} inert={!!turn}>
                {[leftIndex, rightIndex].map((pageIndex, index) => (
                  <article
                    className={styles.paper}
                    key={pageIndex}
                    data-side={index === 0 ? "left" : "right"}
                    tabIndex={0}
                  >
                    <BookPageContent page={project.pages[pageIndex]} />
                  </article>
                ))}
              </div>
              {turn && (
                <div
                  className={styles.turningLeaf}
                  data-direction={turn.direction === 1 ? "forward" : "backward"}
                  aria-hidden="true"
                  inert
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget) finishTurn();
                  }}
                >
                  <div
                    className={`${styles.paper} ${styles.turnFace}`}
                    data-face="front"
                    data-side={turn.direction === 1 ? "right" : "left"}
                    ref={(element) => {
                      if (element) element.scrollTop = turn.scrollTop;
                    }}
                  >
                    <BookPageContent page={project.pages[frontIndex]} />
                  </div>
                  <div
                    className={`${styles.paper} ${styles.turnFace}`}
                    data-face="back"
                    data-side={turn.direction === 1 ? "left" : "right"}
                  >
                    <BookPageContent page={project.pages[backIndex]} />
                  </div>
                </div>
              )}
              {(readerPhase === "opening" || readerPhase === "closing") && (
                <div className={styles.openingCover} aria-hidden="true">
                  <Image
                    className={styles.coverFront}
                    src={project.readerCover.url}
                    alt=""
                    width={project.readerCover.width}
                    height={project.readerCover.height}
                    loading="eager"
                    unoptimized
                  />
                </div>
              )}
              <button
                className={`${styles.pageArrow} ${styles.previousArrow}`}
                aria-label="Previous pages"
                disabled={spread === 0 || readerPhase !== "open" || !!turn}
                onClick={() => turnPage(-1)}
              >
                <span aria-hidden="true">&#8592;</span>
              </button>
              <button
                className={`${styles.pageArrow} ${styles.nextArrow}`}
                aria-label="Next pages"
                disabled={
                  spread === lastSpread || readerPhase !== "open" || !!turn
                }
                onClick={() => turnPage(1)}
              >
                <span aria-hidden="true">&#8594;</span>
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
