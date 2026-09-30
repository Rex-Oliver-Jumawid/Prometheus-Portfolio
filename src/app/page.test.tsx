import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("portfolio homepage", () => {
  it("presents the portfolio as the primary public experience", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "We build systems that make complicated work feel simple.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Furniture operations system" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "See selected work" }),
    ).toHaveAttribute("href", "#work");
  });
});
