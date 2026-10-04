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
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
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
      <section id="work" data-viewport-start="1040" />
    </>,
  );
  return {
    ...view,
    hero: view.container.querySelector<HTMLElement>("#top")!,
    gallery: view.container.querySelector<HTMLElement>("#work")!,
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

it("uses the existing hero scroll distance and reverses the cloud dive", async () => {
  const { hero, layer } = mount();
  expect(hero.getBoundingClientRect().height).toBe(1040);
  expect(createField).not.toHaveBeenCalled();
  act(() =>
    observers.forEach((callback) => callback([], {} as ResizeObserver)),
  );
  flush();
  await scroll(12);
  expect(Number(hero.style.getPropertyValue("--hero-progress"))).toBeCloseTo(
    0.05,
  );
  expect(layer.dataset.active).toBeUndefined();
  await scroll(118.4 + 921.6 * 0.3);
  expect(Number(hero.style.getPropertyValue("--hero-progress"))).toBe(1);
  expect(layer.dataset.active).toBe("true");
  expect(field.draw.mock.lastCall?.[0]).toBeCloseTo(0.3);
  await scroll(1040);
  expect(layer.dataset.active).toBeUndefined();
  await scroll(118.4 + 921.6 * 0.24);
  expect(field.draw.mock.lastCall?.[0]).toBeCloseTo(0.24);
  expect(hero.getBoundingClientRect().height).toBe(1040);
  await scroll(0);
  expect(layer.dataset.active).toBeUndefined();
});

it("skips the dive for reduced motion and releases drawing resources when preferences change", async () => {
  preference.matches = true;
  const { hero, layer, gallery, unmount } = mount();
  await scroll(400);
  expect(hero.getBoundingClientRect().height).toBe(800);
  expect(createField).not.toHaveBeenCalled();
  expect(window.scrollTo).not.toHaveBeenCalled();
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
  expect(gallery.style.getPropertyValue("--gallery-cloud-offset")).toBe("");
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
  expect(window.scrollTo).not.toHaveBeenCalled();
});

it("holds the gallery still beneath the clouds without automatically scrolling", async () => {
  const { hero, layer, gallery } = mount();
  await scroll(80);
  expect(layer.dataset.active).toBeUndefined();
  expect(gallery.style.getPropertyValue("--gallery-cloud-offset")).toBe("");
  expect(window.scrollTo).not.toHaveBeenCalled();
  await scroll(440);
  expect(gallery.style.getPropertyValue("--gallery-cloud-offset")).toBe(
    "600px",
  );
  expect(gallery.dataset.cloudReveal).toBe("true");
  expect(hero.dataset.cloudHandoff).toBe("true");
  expect(hero.style.getPropertyValue("--hero-cloud-opacity")).toBe("1");
  expect(window.scrollY).toBe(440);
  await scroll(118.4 + 921.6 * 0.49);
  expect(
    Number(hero.style.getPropertyValue("--hero-cloud-opacity")),
  ).toBeCloseTo(0.5);
  await scroll(440);
  expect(layer.dataset.active).toBe("true");
  expect(field.draw.mock.lastCall?.[0]).toBeCloseTo((440 - 118.4) / 921.6);
  await scroll(760);
  expect(hero.style.getPropertyValue("--hero-cloud-opacity")).toBe("0");
  expect(gallery.dataset.cloudReveal).toBe("true");
  expect(document.getElementById("top")?.dataset.cloudHandoff).toBe("true");
  expect(gallery.style.getPropertyValue("--gallery-cloud-offset")).toBe(
    "280px",
  );
  expect(field.draw.mock.lastCall?.[0]).toBeCloseTo((760 - 118.4) / 921.6);
  await scroll(880);
  expect(gallery.style.getPropertyValue("--gallery-cloud-offset")).toBe(
    "160px",
  );
  expect(layer.dataset.active).toBe("true");
  expect(field.draw.mock.lastCall?.[0]).toBeCloseTo((880 - 118.4) / 921.6);
  await scroll(1040);
  expect(layer.dataset.active).toBeUndefined();
  expect(gallery.style.getPropertyValue("--gallery-cloud-offset")).toBe("");
  expect(document.getElementById("top")?.dataset.cloudHandoff).toBeUndefined();
  expect(window.scrollY).toBe(1040);
  expect(hero.style.getPropertyValue("--hero-cloud-opacity")).toBe("");
  await scroll(700);
  await scroll(440);
  expect(hero.style.getPropertyValue("--hero-cloud-opacity")).toBe("1");
  await scroll(400);
  expect(window.scrollTo).not.toHaveBeenCalled();
  await scroll(0);
  await scroll(400);
  expect(window.scrollTo).not.toHaveBeenCalled();
});

it("reverses the cloud journey with upward scrolling", async () => {
  const { layer } = mount();
  await scroll(400);
  expect(window.scrollY).toBe(400);
  await scroll(700);
  await scroll(500);
  expect(layer.dataset.active).toBe("true");
  expect(field.draw.mock.lastCall?.[0]).toBeCloseTo((500 - 118.4) / 921.6);
  expect(window.scrollTo).not.toHaveBeenCalled();
});

it("does not pull upward scrolling back into the second viewport", async () => {
  vi.stubGlobal("scrollY", 2500);
  mount();
  await scroll(700);
  await scroll(400);
  expect(window.scrollTo).not.toHaveBeenCalled();
});

it("cleans up an active field and does not keep drawing after unmount", async () => {
  const { unmount, gallery } = mount();
  await scroll(700);
  expect(field.draw).toHaveBeenCalled();
  unmount();
  expect(gallery.style.getPropertyValue("--gallery-cloud-offset")).toBe("");
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
  const { container, layer, gallery } = mount();
  await scroll(700);
  expect(layer.dataset.active).toBe("true");
  fireEvent(
    container.querySelector("canvas")!,
    new Event("webglcontextlost", { cancelable: true }),
  );
  expect(layer.dataset.active).toBeUndefined();
  expect(gallery.style.getPropertyValue("--gallery-cloud-offset")).toBe("");
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

it("warms the first cloud draw while hidden and cancels idle preparation on unmount", async () => {
  let warmUp: IdleRequestCallback | undefined;
  const requestIdle = vi.fn((callback: IdleRequestCallback) => {
    warmUp = callback;
    return 7;
  });
  const cancelIdle = vi.fn();
  vi.stubGlobal("requestIdleCallback", requestIdle);
  vi.stubGlobal("cancelIdleCallback", cancelIdle);
  const { layer, unmount } = mount();
  expect(createField).not.toHaveBeenCalled();
  await act(async () =>
    warmUp?.({ didTimeout: false, timeRemaining: () => 16 }),
  );
  flush();
  expect(createField).toHaveBeenCalledOnce();
  expect(field.draw).toHaveBeenCalledWith(0);
  expect(layer.dataset.active).toBeUndefined();
  unmount();
  expect(cancelIdle).toHaveBeenCalledWith(7);
});

it("skips preparing clouds on deep links and prepares them when scrolling back to the hero", async () => {
  vi.stubGlobal("scrollY", 2500);
  mount();
  expect(createField).not.toHaveBeenCalled();
  await scroll(700);
  expect(createField).toHaveBeenCalledOnce();
  expect(field.draw).toHaveBeenCalled();
});
