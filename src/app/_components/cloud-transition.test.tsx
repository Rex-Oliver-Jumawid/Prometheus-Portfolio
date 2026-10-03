import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { CloudTransition } from "./cloud-transition";
import type { CloudField } from "./create-cloud-field";
import { HeroParallax } from "./hero-parallax";

const field = vi.hoisted(() => ({
  draw: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}));
const createField = vi.hoisted(() =>
  vi.fn<() => Promise<CloudField | undefined>>(async () => field),
);
vi.mock("./create-cloud-field", () => ({ createCloudField: createField }));

let preference: {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};
let frames: Map<number, FrameRequestCallback>;
let observers: ResizeObserverCallback[];
const disconnect = vi.fn();

beforeEach(() => {
  createField.mockResolvedValue(field);
  frames = new Map();
  observers = [];
  preference = {
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => preference);
  vi.stubGlobal("scrollY", 0);
  vi.stubGlobal("innerWidth", 1440);
  vi.stubGlobal("innerHeight", 800);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = frames.size + 1;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        observers.push(callback);
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return {
        height:
          this.id === "top" && this.dataset.parallaxReady === "true"
            ? 1040
            : 800,
        top: 0,
      } as DOMRect;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function mount() {
  const view = render(
    <>
      <HeroParallax />
      <CloudTransition />
      <section id="top" data-viewport-start="0">
        <div data-hero-stage />
      </section>
    </>,
  );
  return {
    ...view,
    hero: view.container.querySelector<HTMLElement>("#top")!,
    layer: view.container.querySelector<HTMLElement>(
      "[data-cloud-transition]",
    )!,
  };
}

function flush() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  });
}

async function scroll(top: number) {
  vi.stubGlobal("scrollY", top);
  await act(async () => {
    fireEvent.scroll(window);
  });
  flush();
}

it("uses the existing scroll distance, reverses the dive, and keeps character travel capped at the knees", async () => {
  const { hero, layer } = mount();
  expect(hero.getBoundingClientRect().height).toBe(1040);
  expect(createField).not.toHaveBeenCalled();
  act(() =>
    observers.forEach((callback) => callback([], {} as ResizeObserver)),
  );
  flush();
  await scroll(12);
  expect(hero.style.getPropertyValue("--hero-travel")).toBe("12px");
  expect(layer.dataset.active).toBeUndefined();
  await scroll(16 + 1024 * 0.3);
  expect(hero.style.getPropertyValue("--hero-travel")).toBe("240px");
  expect(layer.dataset.active).toBe("true");
  expect(field.draw.mock.lastCall?.[0]).toBeCloseTo(0.3);
  await scroll(1040);
  expect(layer.dataset.active).toBeUndefined();
  await scroll(16 + 1024 * 0.24);
  expect(field.draw.mock.lastCall?.[0]).toBeCloseTo(0.24);
  expect(hero.getBoundingClientRect().height).toBe(1040);
  await scroll(0);
  expect(layer.dataset.active).toBeUndefined();
});

it("skips the dive for reduced motion and releases drawing resources when preferences change", async () => {
  preference.matches = true;
  const { hero, layer, unmount } = mount();
  await scroll(400);
  expect(hero.getBoundingClientRect().height).toBe(800);
  expect(createField).not.toHaveBeenCalled();
  preference.matches = false;
  await act(async () =>
    preference.addEventListener.mock.calls.forEach(([, listener]) =>
      listener(),
    ),
  );
  flush();
  expect(hero.getBoundingClientRect().height).toBe(1040);
  preference.matches = true;
  act(() =>
    preference.addEventListener.mock.calls.forEach(([, listener]) =>
      listener(),
    ),
  );
  flush();
  expect(hero.getBoundingClientRect().height).toBe(800);
  expect(layer.dataset.active).toBeUndefined();
  expect(field.dispose).toHaveBeenCalledOnce();
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(2);
  expect(preference.removeEventListener).toHaveBeenCalledTimes(2);
});

it("preserves native scrolling when canvas is unavailable", async () => {
  createField.mockResolvedValueOnce(undefined);
  const { hero, layer } = mount();
  await scroll(400);
  expect(hero.getBoundingClientRect().height).toBe(1040);
  expect(layer.dataset.active).toBeUndefined();
  expect(createField).toHaveBeenCalledOnce();
});

it("cleans up an active field and does not keep drawing after unmount", async () => {
  const { unmount } = mount();
  await scroll(700);
  expect(field.draw).toHaveBeenCalled();
  unmount();
  expect(field.dispose).toHaveBeenCalledOnce();
  field.draw.mockClear();
  await scroll(800);
  expect(field.draw).not.toHaveBeenCalled();
});

it("keeps native scrolling when the cloud shader cannot initialize", async () => {
  createField.mockRejectedValueOnce(new Error("Shader compilation failed"));
  const { hero, layer } = mount();
  await scroll(700);
  await scroll(800);
  expect(layer.dataset.active).toBeUndefined();
  expect(hero.getBoundingClientRect().height).toBe(1040);
  expect(createField).toHaveBeenCalledOnce();
});

it("hides clouds and frees resources when the graphics context is lost", async () => {
  const { container, layer } = mount();
  await scroll(700);
  expect(layer.dataset.active).toBe("true");
  fireEvent(
    container.querySelector("canvas")!,
    new Event("webglcontextlost", { cancelable: true }),
  );
  expect(layer.dataset.active).toBeUndefined();
  expect(field.dispose).toHaveBeenCalledOnce();
  field.draw.mockClear();
  await scroll(800);
  expect(field.draw).not.toHaveBeenCalled();
});

it("disposes a field that finishes preparing after unmount", async () => {
  let finish!: (value: CloudField) => void;
  createField.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { unmount } = mount();
  await scroll(700);
  expect(createField).toHaveBeenCalledOnce();
  unmount();
  await act(async () => finish(field));
  expect(field.dispose).toHaveBeenCalledOnce();
  expect(field.draw).not.toHaveBeenCalled();
});

it("skips preparing clouds on deep links and prepares them when scrolling back to the hero", async () => {
  vi.stubGlobal("scrollY", 2500);
  mount();
  expect(createField).not.toHaveBeenCalled();
  await scroll(700);
  expect(createField).toHaveBeenCalledOnce();
  expect(field.draw).toHaveBeenCalled();
});
