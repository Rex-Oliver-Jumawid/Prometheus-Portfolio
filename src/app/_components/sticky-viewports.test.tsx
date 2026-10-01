import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { StickyViewports } from "./sticky-viewports";

let resize: ResizeObserverCallback;
let scheduled: FrameRequestCallback | undefined;
let longHeight: number;
const disconnect = vi.fn();

beforeEach(() => {
  longHeight = 1200;
  scheduled = undefined;
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    scheduled = callback;
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.id === "first") return { top: 0, height: 800 } as DOMRect;
      if (this.id === "second")
        return { top: 800, height: longHeight } as DOMRect;
      if (this.id === "second-title") return { bottom: 1880 } as DOMRect;
      return { top: 0, height: 0 } as DOMRect;
    },
  );
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function panels() {
  return render(
    <StickyViewports>
      <section id="first">
        <h2>First viewport</h2>
      </section>
      <section id="second" aria-labelledby="second-title">
        <h2 id="second-title">Second viewport</h2>
      </section>
    </StickyViewports>,
  );
}

it("pins tall sections only after their extra content can scroll and cleans up observers", () => {
  const { container, unmount } = panels();
  const root = container.querySelector("main")!;
  const first = container.querySelector<HTMLElement>("#first")!;
  const second = container.querySelector<HTMLElement>("#second")!;
  expect(first.style.getPropertyValue("--viewport-top")).toBe("0px");
  expect(second.style.getPropertyValue("--viewport-top")).toBe("-400px");
  expect(second.style.getPropertyValue("--viewport-order")).toBe("2");
  expect(root.dataset.stickyReady).toBe("true");
  longHeight = 1600;
  act(() => resize([], {} as ResizeObserver));
  expect(second.style.getPropertyValue("--viewport-top")).toBe("-800px");
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
  expect(first.style.getPropertyValue("--viewport-top")).toBe("");
  expect(root.dataset.stickyReady).toBeUndefined();
});

it("uses the flow position for hash navigation and keeps a bottom-positioned title visible", () => {
  panels();
  window.history.replaceState(null, "", "#second");
  fireEvent(window, new HashChangeEvent("hashchange"));
  expect(scheduled).toBeDefined();
  act(() => scheduled?.(0));
  expect(window.scrollTo).toHaveBeenCalledWith({
    top: 1104,
    behavior: "instant",
  });
});
