import { expect, test } from "@playwright/test";

test("shows the public portfolio homepage", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Where Ideas Ignite/,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Prometheus" });
  await expect(
    dialog.getByRole("link", { name: "Work", exact: true }),
  ).toHaveAttribute("href", "#work");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();

  await expect(
    page.getByRole("heading", { name: "Furniture operations system" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open navigation" }).click();
  await dialog.getByRole("link", { name: "Approach", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#approach$/);
  await expect(
    page.getByRole("heading", {
      name: "Understand the operation first. Build the software second.",
    }),
  ).toBeInViewport();
});

for (const [width, height] of [
  [320, 568],
  [390, 667],
  [768, 768],
  [1366, 768],
  [1440, 900],
  [844, 390],
]) {
  test(`fits the hero and its controls in one ${width}×${height} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const hero = page.locator("#top");
    const bounds = await hero.boundingBox();
    expect(bounds!.height).toBe(height);
    const figure = await hero.locator('img[height="718"]').boundingBox();
    const workBounds = await page.locator("#work").boundingBox();
    expect(figure!.y + figure!.height).toBeGreaterThan(workBounds!.y);
    await expect(hero).toHaveCSS("overflow-y", "visible");
    const stack = hero.getByRole("complementary", { name: "From Prometheus" });
    await expect(stack).toBeInViewport({ ratio: 1 });
    await expect(stack.getByRole("button")).toHaveCount(0);
    const copyBounds = await page
      .getByRole("link", { name: "See our work" })
      .boundingBox();
    const cardBounds = await hero.getByRole("article").boundingBox();
    expect(cardBounds!.y).toBeGreaterThanOrEqual(0);
    expect(cardBounds!.y + cardBounds!.height).toBeLessThanOrEqual(height);
    if (height > 500)
      expect(copyBounds!.y + copyBounds!.height).toBeLessThanOrEqual(
        cardBounds!.y,
      );

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const headline = await heading.locator("span").first().boundingBox();
    expect(headline).not.toBeNull();
    expect(headline!.x + headline!.width).toBeLessThanOrEqual(width);

    await expect(
      page.getByRole("heading", {
        name: "We want to bring ideas to life.",
      }),
    ).toBeVisible();
    await expect(hero.getByRole("article")).toHaveCSS(
      "transition-duration",
      "0s",
    );

    await page.getByRole("button", { name: "Open navigation" }).click();
    const dialog = page.getByRole("dialog", { name: "Prometheus" });
    const close = dialog.getByRole("button", { name: "Close navigation" });
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("link", { name: "Start a conversation" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();

    await page.getByRole("link", { name: "See our work" }).click();
    await expect(page).toHaveURL(/#work$/);
    await expect(
      page.getByRole("heading", {
        name: "Systems shaped around the work, not the other way around.",
      }),
    ).toBeInViewport();
  });
}
