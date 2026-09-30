import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeroQuote } from "./hero-quote";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function advanceTime() {
  act(() => vi.advanceTimersByTime(8000));
}

describe("hero toast stack", () => {
  it("automatically rotates through the stack and wraps to the first card", () => {
    render(<HeroQuote />);
    advanceTime();
    expect(
      screen.getByRole("heading", {
        name: "Your business. One connected system.",
      }),
    ).toBeInTheDocument();
    for (let turn = 0; turn < 3; turn++) advanceTime();
    expect(
      screen.getByRole("heading", { name: "We want to bring ideas to life." }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("pauses for hover and keyboard focus, then resumes without controls", () => {
    render(<HeroQuote />);
    const stack = screen.getByRole("complementary", {
      name: "From Prometheus",
    });
    fireEvent.mouseEnter(stack);
    advanceTime();
    expect(
      screen.getByRole("heading", { name: "We want to bring ideas to life." }),
    ).toBeInTheDocument();
    fireEvent.mouseLeave(stack);
    fireEvent.focus(stack);
    advanceTime();
    expect(
      screen.getByRole("heading", { name: "We want to bring ideas to life." }),
    ).toBeInTheDocument();
    fireEvent.blur(stack, {
      relatedTarget: document.body,
    });
    advanceTime();
    expect(
      screen.getByRole("heading", {
        name: "Your business. One connected system.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps reduced-motion playback still", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(<HeroQuote />);
    advanceTime();
    expect(
      screen.getByRole("heading", { name: "We want to bring ideas to life." }),
    ).toBeInTheDocument();
  });

  it("suspends playback in a hidden tab and clears timers when unmounted", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const { unmount } = render(<HeroQuote />);
    hidden.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    advanceTime();
    expect(
      screen.getByRole("heading", { name: "We want to bring ideas to life." }),
    ).toBeInTheDocument();
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    advanceTime();
    expect(
      screen.getByRole("heading", {
        name: "Your business. One connected system.",
      }),
    ).toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
