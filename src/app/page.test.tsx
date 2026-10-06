import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "./page";
import type { ReactNode } from "react";

vi.mock("./_components/sticky-viewports", () => ({
  StickyViewports: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));

vi.mock("./_components/hero-parallax", () => ({
  HeroParallax: () => null,
}));

vi.mock(
  "@/components/portfolio/project-book-handoff/project-book-handoff",
  () => ({
    ProjectBookHandoff: () => null,
  }),
);

vi.mock("@/components/portfolio/project-gallery/gallery-backdrop", () => ({
  GalleryBackdrop: () => null,
}));

vi.mock(
  "@/components/portfolio/project-gallery/project-gallery-client",
  () => ({
    ProjectGalleryClient: () => null,
  }),
);

vi.mock(
  "@/components/portfolio/project-library/project-library-client",
  () => ({
    ProjectLibraryClient: () => null,
  }),
);

afterEach(cleanup);

describe("portfolio homepage", () => {
  it("presents the hero, book, library, and contact footer in order", () => {
    render(<Home />);

    const heroHeading = screen.getByRole("heading", {
      level: 1,
      name: /Where ideas ignite/i,
    });
    const hero = heroHeading.closest("section")!;

    const galleryHeading = screen.getByRole("heading", {
      level: 2,
      name: "Furniture Odyssey",
    });
    const gallery = galleryHeading.closest("section")!;
    expect(gallery).toHaveAttribute("id", "work");
    expect(hero.nextElementSibling).toBe(gallery);

    const libraryHeading = screen.getByRole("heading", {
      level: 2,
      name: "The Prometheus Library",
    });
    const library = libraryHeading.closest("section")!;
    expect(library).toHaveAttribute("id", "library");
    expect(gallery.nextElementSibling).toBe(library);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /build a system around how your business actually works/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "We design connected systems around how businesses actually work.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("opens accessible navigation, closes on Escape, and restores focus", async () => {
    render(<Home />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Prometheus" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      within(dialog).getByRole("navigation", { name: "Primary navigation" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Work" })).toHaveAttribute(
      "href",
      "#work",
    );
    expect(
      within(dialog).getByRole("link", { name: "Library" }),
    ).toHaveAttribute("href", "#library");

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes navigation when the library is selected", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("link", { name: "Library" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("keeps the homepage gallery visually book-only", () => {
    render(<Home />);
    const gallery = document.querySelector<HTMLElement>("#work")!;
    expect(
      within(gallery).queryByText("A Prometheus case study"),
    ).not.toBeInTheDocument();
    expect(
      within(gallery).queryByText(/Products, orders, quotations/),
    ).not.toBeInTheDocument();
  });
});
