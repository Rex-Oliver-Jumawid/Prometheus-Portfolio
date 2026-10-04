import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { SmoothScroll } from "./smooth-scroll";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("lenis", () => ({
  default: class {
    constructor(options: unknown) {
      mocks.create(options);
    }
    destroy = mocks.destroy;
    start = mocks.start;
    stop = mocks.stop;
  },
}));

function setupMotion(matches = false) {
  const media = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  return media;
}

afterEach(() => {
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("respects live reduced-motion changes and cleans up on unmount", () => {
  const media = setupMotion(true);
  const { unmount } = render(<SmoothScroll />);
  expect(mocks.create).not.toHaveBeenCalled();

  const change = media.addEventListener.mock.calls[0][1];
  media.matches = false;
  act(() => change());
  expect(mocks.create).toHaveBeenCalledOnce();
  media.matches = true;
  act(() => change());
  expect(mocks.destroy).toHaveBeenCalledOnce();
  media.matches = false;
  act(() => change());
  unmount();
  expect(mocks.destroy).toHaveBeenCalledTimes(2);
  expect(media.removeEventListener).toHaveBeenCalledWith("change", change);
});

it("slows wheel input only during clouds and preserves reverse and touch input", () => {
  setupMotion();
  const view = (
    <>
      <div
        data-cloud-transition
        data-scroll-start="100"
        data-scroll-end="500"
      />
      <SmoothScroll />
    </>
  );
  const { unmount } = render(view);
  const virtualScroll = mocks.create.mock.calls[0][0].virtualScroll;
  const wheel = (deltaY = 100) => ({
    deltaX: 0,
    deltaY,
    event: new WheelEvent("wheel"),
  });
  const beforeClouds = wheel();
  vi.stubGlobal("scrollY", 0);
  expect(virtualScroll(beforeClouds)).toBe(true);
  expect(beforeClouds.deltaY).toBe(100);

  // The renderer can still be loading: braking must not depend on data-active.
  vi.stubGlobal("scrollY", 300);
  const forward = wheel();
  virtualScroll(forward);
  expect(forward.deltaY).toBe(35);
  const reverse = wheel(-100);
  virtualScroll(reverse);
  expect(reverse.deltaY).toBe(-35);
  const touch = { deltaX: 0, deltaY: 100, event: new Event("touchmove") };
  virtualScroll(touch);
  expect(touch.deltaY).toBe(100);

  vi.stubGlobal("scrollY", 50);
  const approaching = wheel();
  virtualScroll(approaching);
  expect(approaching.deltaY).toBeCloseTo(91.27, 2);
  vi.stubGlobal("scrollY", 99);
  const entering = wheel(2);
  virtualScroll(entering);
  expect(entering.deltaY).toBeGreaterThan(1.99);
  vi.stubGlobal("scrollY", 550);
  const returning = wheel(-100);
  virtualScroll(returning);
  expect(returning.deltaY).toBeCloseTo(-91.27, 2);

  vi.stubGlobal("scrollY", 600);
  const afterClouds = wheel();
  virtualScroll(afterClouds);
  expect(afterClouds.deltaY).toBe(100);
  unmount();
});

it("honors background scroll locks while keeping modal scrolling native", async () => {
  setupMotion();
  const { unmount } = render(<SmoothScroll />);
  const options = mocks.create.mock.calls[0][0];
  expect(options.autoRaf).toBe(true);
  expect(options.allowNestedScroll).toBe(true);
  expect(options.prevent(document.createElement("dialog"))).toBe(true);
  const modal = document.createElement("div");
  modal.setAttribute("role", "dialog");
  expect(options.prevent(modal)).toBe(true);
  expect(options.prevent(document.body)).toBe(false);

  await act(async () => {
    document.body.style.overflow = "hidden";
  });
  expect(mocks.stop).toHaveBeenCalledOnce();
  mocks.start.mockClear();
  await act(async () => {
    document.body.style.overflow = "";
  });
  expect(mocks.start).toHaveBeenCalledOnce();

  unmount();
  await act(async () => {
    document.body.style.overflow = "hidden";
  });
  expect(mocks.stop).toHaveBeenCalledOnce();
  expect(mocks.destroy).toHaveBeenCalledOnce();
});
