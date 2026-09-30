import { expect, test } from "@playwright/test";

test("shows the public portfolio homepage", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "We build systems that make complicated work feel simple.",
    }),
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Work" })).toHaveAttribute(
    "href",
    "#work",
  );

  await expect(
    page.getByRole("heading", { name: "Furniture operations system" }),
  ).toBeVisible();
});
