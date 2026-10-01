import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { furnitureOdyssey } from "@/content/projects";
import type { GalleryScene } from "@/lib/three/create-gallery-scene";

import { ProjectGalleryClient } from "./project-gallery-client";
import styles from "./project-gallery.module.css";

// React selects its animation event name at import time; jsdom lacks this constructor.
vi.hoisted(() => {
  Object.defineProperty(window, "AnimationEvent", {
    configurable: true,
    value: Event,
  });
});

const scene = vi.hoisted(() => ({
  getCoverPose: vi.fn<GalleryScene["getCoverPose"]>(),
  getBookBounds:
    vi.fn<
      () => { left: number; top: number; width: number; height: number } | null
    >(),
  setVisible: vi.fn(),
  setPaused: vi.fn(),
  setReducedMotion: vi.fn(),
  setScrollProgress: vi.fn(),
  rotate: vi.fn(),
  tilt: vi.fn(),
  dispose: vi.fn(),
}));
const createScene = vi.hoisted(() => vi.fn());
vi.mock("@/lib/three/create-gallery-scene", () => ({
  createGalleryScene: createScene,
}));

let intersections: {
  callback: IntersectionObserverCallback;
  observer: IntersectionObserver;
}[];
let reduced = false;

beforeEach(() => {
  vi.clearAllMocks();
  reduced = false;
  intersections = [];
  createScene.mockResolvedValue(scene);
  scene.getBookBounds.mockReturnValue(null);
  scene.getCoverPose.mockReturnValue(null);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersections.push({
          callback,
          observer: this as unknown as IntersectionObserver,
        });
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

function enterViewport() {
  intersections.forEach(({ callback, observer }) =>
    callback([{ isIntersecting: true } as IntersectionObserverEntry], observer),
  );
}
function finishBookAnimation(dialog: HTMLElement) {
  fireEvent.animationEnd(dialog.querySelector(`.${styles.bookStage}`)!);
}
function finishPageTurn(dialog: HTMLElement) {
  fireEvent.animationEnd(dialog.querySelector(`.${styles.turningLeaf}`)!);
}

describe("isolated project gallery", () => {
  it("defers the scene until near the viewport and releases it on unmount", async () => {
    const view = render(<ProjectGalleryClient project={furnitureOdyssey} />);
    expect(createScene).not.toHaveBeenCalled();
    enterViewport();
    await waitFor(() =>
      expect(screen.getByText("Interactive book ready.")).toBeInTheDocument(),
    );
    expect(createScene).toHaveBeenCalledWith(
      expect.objectContaining({
        bookUrl: furnitureOdyssey.modelUrl,
      }),
    );
    expect(createScene.mock.calls[0][0]).not.toHaveProperty("pillarUrl");
    expect(document.querySelector('img[src*="pillar"]')).toBeNull();
    const book = screen.getByRole("button", { name: "Read Furniture Odyssey" });
    expect(screen.queryByRole("button", { name: /Open the book/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Rotate book/ })).toBeNull();
    fireEvent.keyDown(book, { key: "ArrowLeft" });
    expect(scene.rotate).toHaveBeenCalledWith(-1);
    fireEvent.keyDown(book, { key: "ArrowUp" });
    expect(scene.tilt).toHaveBeenLastCalledWith(-1);
    fireEvent.keyDown(book, { key: "ArrowDown" });
    expect(scene.tilt).toHaveBeenLastCalledWith(1);
    expect(screen.queryByRole("button", { name: /motion/i })).toBeNull();
    expect(screen.queryByText(/Drag to turn and tilt/)).toBeNull();
    expect(document.querySelector("video")).toBeNull();
    view.unmount();
    expect(scene.dispose).toHaveBeenCalledOnce();
    expect(createScene.mock.calls[0][0].signal.aborted).toBe(true);
  });

  it("keeps reading and pagination usable when WebGL fails", async () => {
    createScene.mockRejectedValue(new Error("WebGL unavailable"));
    render(<ProjectGalleryClient project={furnitureOdyssey} />);
    enterViewport();
    await screen.findByText(
      "3D view unavailable. You can still open and read the book.",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Read Furniture Odyssey" }),
    );
    expect(
      screen.getByRole("dialog", { name: furnitureOdyssey.title }),
    ).toBeInTheDocument();
    finishBookAnimation(screen.getByRole("dialog"));
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    finishPageTurn(screen.getByRole("dialog"));
    expect(
      within(
        screen
          .getByRole("dialog")
          .querySelector(`.${styles.spread}`) as HTMLElement,
      ).getByRole("heading", {
        name: furnitureOdyssey.pages[2].title,
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    finishPageTurn(screen.getByRole("dialog"));
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("dialog"));
    finishBookAnimation(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses the cover only during opening and closing, never over the open pages", async () => {
    render(<ProjectGalleryClient project={furnitureOdyssey} />);
    enterViewport();
    await screen.findByText("Interactive book ready.");
    scene.getBookBounds.mockReturnValue({
      left: 400,
      top: 200,
      width: 200,
      height: 300,
    });
    const dialog = document.querySelector("dialog")!;
    const stage = dialog.querySelector(`.${styles.bookStage}`)!;
    Object.defineProperties(stage, {
      offsetWidth: { configurable: true, value: 1000 },
      offsetHeight: { configurable: true, value: 600 },
    });
    vi.spyOn(stage.parentElement!, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 100,
      width: 1000,
      height: 600,
    } as DOMRect);
    scene.getCoverPose.mockReturnValue({
      topLeft: { x: 400, y: 200 },
      topRight: { x: 600, y: 210 },
      bottomLeft: { x: 390, y: 500 },
    });
    const book = screen.getByRole("button", { name: "Read Furniture Odyssey" });
    book.focus();
    fireEvent.keyDown(book, { key: "Enter" });
    expect(dialog).toHaveAttribute("data-phase", "opening");
    const matrix = dialog.style
      .getPropertyValue("--book-rest-transform")
      .slice(7, -1)
      .split(",")
      .map(Number);
    const project = (x: number, y: number) => ({
      x: 100 + matrix[0] * x + matrix[2] * y + matrix[4],
      y: 100 + matrix[1] * x + matrix[3] * y + matrix[5],
    });
    expect(project(500, 0)).toEqual({ x: 400, y: 200 });
    expect(project(1000, 0)).toEqual({ x: 600, y: 210 });
    expect(project(500, 600)).toEqual({ x: 390, y: 500 });
    expect(scene.setPaused).toHaveBeenLastCalledWith(true);
    expect(dialog.querySelector(`.${styles.openingCover} img`)).toHaveAttribute(
      "src",
      furnitureOdyssey.readerCover.url,
    );
    expect(dialog.querySelector("article img")).toBeNull();
    expect(
      Number(dialog.style.getPropertyValue("--book-spread-aspect")),
    ).toBeCloseTo(
      (2 * furnitureOdyssey.readerCover.width) /
        furnitureOdyssey.readerCover.height,
    );
    expect(
      within(dialog).queryByRole("link", { name: /original book project/i }),
    ).toBeNull();
    expect(within(dialog).queryByText(/^Pages /)).toBeNull();
    expect(dialog.querySelectorAll("article")).toHaveLength(2);
    expect(scene.setVisible).toHaveBeenLastCalledWith(false);
    expect(book).toHaveAttribute("data-reading", "true");
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
    fireEvent.animationEnd(dialog.querySelector("article")!);
    expect(dialog).toHaveAttribute("data-phase", "opening");
    finishBookAnimation(dialog);
    expect(dialog).toHaveAttribute("data-phase", "open");
    expect(dialog.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: /Next/ })).toBeEnabled();

    expect(dialog.querySelector<HTMLElement>("article")).toHaveFocus();
    expect(
      within(dialog).queryByRole("button", { name: "Close book" }),
    ).toBeNull();
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog).toHaveAttribute("data-phase", "closing");
    expect(scene.setPaused).toHaveBeenLastCalledWith(true);
    expect(scene.setVisible).toHaveBeenLastCalledWith(true);
    expect(dialog.querySelector(`.${styles.openingCover} img`)).toHaveAttribute(
      "src",
      furnitureOdyssey.readerCover.url,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    finishBookAnimation(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(book).toHaveFocus();
    expect(book).toHaveAttribute("data-reading", "false");
    expect(document.documentElement.style.overflow).toBe("");
    expect(scene.setVisible).toHaveBeenLastCalledWith(true);
    expect(scene.setPaused).toHaveBeenLastCalledWith(false);
  });

  it("turns a sheet with old and new faces before committing the next or previous spread", () => {
    render(<ProjectGalleryClient project={furnitureOdyssey} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Read Furniture Odyssey" }),
    );
    const dialog = screen.getByRole("dialog");
    finishBookAnimation(dialog);
    const rightPage = dialog.querySelector<HTMLElement>(
      `.${styles.spread} > article[data-side="right"]`,
    )!;
    rightPage.scrollTop = 80;
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(
      within(
        screen
          .getByRole("dialog")
          .querySelector(`.${styles.spread}`) as HTMLElement,
      ).getByRole("heading", {
        name: furnitureOdyssey.pages[0].title,
      }),
    ).toBeInTheDocument();
    const leaf = dialog.querySelector<HTMLElement>(`.${styles.turningLeaf}`)!;
    expect(leaf).toHaveAttribute("data-direction", "forward");
    expect(leaf).toHaveAttribute("aria-hidden", "true");
    const front = leaf.querySelector<HTMLElement>('[data-face="front"]')!;
    const back = leaf.querySelector<HTMLElement>('[data-face="back"]')!;
    expect(
      within(front).getByText(furnitureOdyssey.pages[1].title),
    ).toBeInTheDocument();
    expect(front.scrollTop).toBe(80);
    expect(
      within(back).getByText(furnitureOdyssey.pages[2].title),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.animationEnd(front);
    expect(
      within(
        screen
          .getByRole("dialog")
          .querySelector(`.${styles.spread}`) as HTMLElement,
      ).getByRole("heading", {
        name: furnitureOdyssey.pages[0].title,
      }),
    ).toBeInTheDocument();
    finishPageTurn(dialog);
    expect(
      within(
        screen
          .getByRole("dialog")
          .querySelector(`.${styles.spread}`) as HTMLElement,
      ).getByRole("heading", {
        name: furnitureOdyssey.pages[2].title,
      }),
    ).toBeInTheDocument();
    expect(dialog.querySelector(`.${styles.turningLeaf}`)).toBeNull();

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    const previous = dialog.querySelector<HTMLElement>(
      `.${styles.turningLeaf}`,
    )!;
    expect(previous).toHaveAttribute("data-direction", "backward");
    expect(
      within(
        previous.querySelector('[data-face="front"]') as HTMLElement,
      ).getByText(furnitureOdyssey.pages[2].title),
    ).toBeInTheDocument();
    expect(
      within(
        previous.querySelector('[data-face="back"]') as HTMLElement,
      ).getByText(furnitureOdyssey.pages[1].title),
    ).toBeInTheDocument();
    finishPageTurn(dialog);
    expect(
      within(
        screen
          .getByRole("dialog")
          .querySelector(`.${styles.spread}`) as HTMLElement,
      ).getByRole("heading", {
        name: furnitureOdyssey.pages[0].title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
  });

  it("finishes transitions even when animation events are unavailable", () => {
    vi.useFakeTimers();
    render(<ProjectGalleryClient project={furnitureOdyssey} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Read Furniture Odyssey" }),
    );
    const dialog = screen.getByRole("dialog");
    act(() => vi.advanceTimersByTime(1200));
    expect(dialog).toHaveAttribute("data-phase", "open");
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    act(() => vi.advanceTimersByTime(700));
    expect(
      within(
        screen
          .getByRole("dialog")
          .querySelector(`.${styles.spread}`) as HTMLElement,
      ).getByRole("heading", {
        name: furnitureOdyssey.pages[2].title,
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("dialog"));
    expect(dialog.querySelector(`.${styles.turningLeaf}`)).toBeNull();
    act(() => vi.advanceTimersByTime(750));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("scrubs book growth in both scroll directions and removes its listeners", async () => {
    const view = render(<ProjectGalleryClient project={furnitureOdyssey} />);
    const book = screen.getByRole("button", { name: "Read Furniture Odyssey" });
    const bounds = vi.spyOn(book, "getBoundingClientRect");
    const setTop = (top: number) => bounds.mockReturnValue({ top } as DOMRect);
    setTop(window.innerHeight);
    enterViewport();
    await screen.findByText("Interactive book ready.");
    expect(scene.setScrollProgress).toHaveBeenLastCalledWith(0);

    setTop(window.innerHeight / 2);
    fireEvent.scroll(window);
    expect(scene.setScrollProgress).toHaveBeenLastCalledWith(0.5);
    setTop(-100);
    fireEvent.scroll(window);
    expect(scene.setScrollProgress).toHaveBeenLastCalledWith(1);
    setTop(window.innerHeight / 2);
    fireEvent.scroll(window);
    expect(scene.setScrollProgress).toHaveBeenLastCalledWith(0.5);
    setTop(window.innerHeight + 100);
    fireEvent.scroll(window);
    expect(scene.setScrollProgress).toHaveBeenLastCalledWith(0);

    fireEvent.keyDown(book, { key: "Enter" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    view.unmount();
    scene.setScrollProgress.mockClear();
    fireEvent.scroll(window);
    expect(scene.setScrollProgress).not.toHaveBeenCalled();
  });

  it("respects reduced motion without visible motion controls", async () => {
    reduced = true;
    render(<ProjectGalleryClient project={furnitureOdyssey} />);
    enterViewport();
    await screen.findByText("Interactive book ready.");
    expect(createScene).toHaveBeenCalledWith(
      expect.objectContaining({ reducedMotion: true }),
    );
    expect(screen.queryByRole("button", { name: /motion/i })).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(document.querySelector("video")).toBeNull();
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Read Furniture Odyssey" }),
      { key: "Enter" },
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("data-phase", "open");
    expect(screen.getByRole("button", { name: /Next/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(
      within(
        screen
          .getByRole("dialog")
          .querySelector(`.${styles.spread}`) as HTMLElement,
      ).getByRole("heading", {
        name: furnitureOdyssey.pages[2].title,
      }),
    ).toBeInTheDocument();
    expect(document.querySelector(`.${styles.turningLeaf}`)).toBeNull();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog.querySelector("article")!);
    expect(dialog).toBeInTheDocument();
    fireEvent.click(dialog.querySelector(`.${styles.bookViewport}`)!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
