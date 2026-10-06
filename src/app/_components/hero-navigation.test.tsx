import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeroNavigation } from "./hero-navigation";

let reportVisibility: (visible: boolean) => void;
const observe = vi.fn();
const disconnect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        reportVisibility = (visible) =>
          callback(
            [{ isIntersecting: visible } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
      }

      observe = observe;
      disconnect = disconnect;
    },
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderNavigation() {
  return render(
    <>
      <HeroNavigation />
      <section id="contact" aria-label="Contact" />
    </>,
  );
}

describe("navigation at the footer", () => {
  it("hides both controls when the footer enters view and restores them on exit", () => {
    const { unmount } = renderNavigation();
    const banner = screen.getByRole("link", { name: "Prometheus home" });
    const header = banner.closest("header")!;
    expect(observe).toHaveBeenCalledWith(document.getElementById("contact"));
    expect(screen.getByRole("link", { name: "Prometheus home" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeVisible();

    act(() => reportVisibility(true));
    expect(header).toHaveAttribute("inert");
    expect(header).toHaveAttribute("aria-hidden", "true");
    expect(header).not.toHaveAttribute("hidden");
    expect(banner).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Prometheus home" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open navigation" })).toBeNull();

    act(() => reportVisibility(false));
    expect(header).not.toHaveAttribute("inert");
    expect(screen.getByRole("link", { name: "Prometheus home" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeVisible();

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("dismisses an open menu and keeps it closed when leaving the footer", () => {
    renderNavigation();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("dialog", { name: "Primary navigation" }),
    ).toBeVisible();

    act(() => reportVisibility(true));
    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => reportVisibility(false));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
