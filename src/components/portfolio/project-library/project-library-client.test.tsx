import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectLibraryClient } from "./project-library-client";
import styles from "./project-library.module.css";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  idle: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock("@/lib/three/create-library-scene", () => ({
  createLibraryScene: mocks.create,
}));
vi.mock("@/lib/browser/schedule-idle-preparation", () => ({
  scheduleIdlePreparation: mocks.idle,
}));
const scene = {
  setVisible: vi.fn(),
  dispose: vi.fn(),
  setReducedMotion: vi.fn(),
  setCoarsePointer: vi.fn(),
};
let near: IntersectionObserverCallback;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.idle.mockReturnValue(mocks.cancel);
  mocks.create.mockResolvedValue(scene);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        if (options?.rootMargin) near = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("prepares the shelf after the gallery and retains a usable poster through loading and failure", async () => {
  let reject!: (error: Error) => void;
  mocks.create.mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const view = render(<ProjectLibraryClient />);
  const poster = screen.getByRole("link", { name: /Read Furniture Odyssey/ });
  expect(poster).toHaveAttribute("href", "#work");
  expect(screen.queryByText(/Opening the library/i)).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(mocks.create).not.toHaveBeenCalled();
  fireEvent(window, new Event("gallery-prepared"));
  await act(async () => mocks.idle.mock.calls[0][0]());
  await act(async () =>
    near(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
  expect(mocks.create).toHaveBeenCalledOnce();
  expect(poster).toBeInTheDocument();
  expect(view.container.querySelector(`.${styles.canvasHost}`)).toHaveAttribute(
    "data-ready",
    "false",
  );
  await act(async () => reject(new Error("Model unavailable")));
  expect(poster).toBeInTheDocument();
  expect(screen.getByText(/3D library unavailable/)).toHaveClass(styles.srOnly);
  view.unmount();
  expect(mocks.cancel).toHaveBeenCalled();
  expect(mocks.create.mock.calls[0][0].signal.aborted).toBe(true);
  log.mockRestore();
});

it("exposes the rendered shelf only after scene readiness and disposes it", async () => {
  const view = render(<ProjectLibraryClient />);
  await act(async () =>
    near(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
  expect(view.container.querySelector(`.${styles.canvasHost}`)).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(
    screen.queryByRole("link", { name: /Read Furniture Odyssey/ }),
  ).toBeNull();
  view.unmount();
  expect(scene.dispose).toHaveBeenCalledOnce();
});
