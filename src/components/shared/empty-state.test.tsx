import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders its accessible heading and guidance", () => {
    render(
      <EmptyState
        title="No customers"
        description="Create the first customer to begin."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No customers" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create the first customer to begin."),
    ).toBeInTheDocument();
  });
});
