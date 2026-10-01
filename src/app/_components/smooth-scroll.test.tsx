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
  vi.stubGlobal("matchMedia", vi.fn(() => media));
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
