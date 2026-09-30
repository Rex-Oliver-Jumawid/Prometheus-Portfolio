import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Home from "./page";

afterEach(cleanup);

describe("portfolio homepage", () => {
  it("presents the portfolio as the primary public experience", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Where Ideas Ignite/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Furniture operations system" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "See our work" })).toHaveAttribute(
      "href",
      "#work",
    );

    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      "#approach",
    );
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

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes navigation when a portfolio section is selected", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("link", { name: "Approach" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("presents the toast stack without card controls", () => {
    render(<Home />);
    const stack = screen.getByRole("complementary", {
      name: "From Prometheus",
    });
    expect(within(stack).queryByRole("button")).not.toBeInTheDocument();
    expect(
      within(stack).getByRole("heading", {
        name: "We want to bring ideas to life.",
      }),
    ).toBeInTheDocument();
  });
});
