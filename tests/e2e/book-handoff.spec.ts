import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [390, 667],
]) {
  test(`reference book remains interactive after the cloud reveal at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toHaveAttribute(
      "data-sticky-ready",
      "true",
    );
    const position = await page
      .locator("#work")
      .evaluate(
        (section) =>
          Math.round(Number((section as HTMLElement).dataset.viewportStart)) +
          60,
      );
    const cloudMiddle = await page.locator("#top").evaluate((hero) => {
      const height = innerHeight;
      const heroHeight = Number((hero as HTMLElement).dataset.viewportHeight);
      const lead = Math.min(heroHeight - height, height * 0.28);
      const distance = (lead + height) * 0.9;
      return Math.round(heroHeight - distance * 0.6);
    });
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      cloudMiddle,
    );
    await expect(page.locator("[data-cloud-transition]")).toHaveAttribute(
      "data-active",
      "true",
    );
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      position,
    );
    const book = page
      .locator("#work")
      .getByRole("button", { name: "Read Furniture Odyssey" });
    await expect(book).toHaveAttribute("data-visible", "true");
    await expect(book).toHaveAttribute("tabindex", "0");
    await expect(book).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId("book-handoff")).toHaveAttribute(
      "data-visible",
      "false",
    );
    await expect(page.locator("[data-cloud-transition]")).not.toHaveAttribute(
      "data-active",
      "true",
    );
    const box = (await book.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 25, y + 45, { steps: 6 });
    await page.mouse.up();
    const reader = page.getByRole("dialog", { name: "Furniture Odyssey" });
    await expect(reader).toBeHidden();
    await page.mouse.click(x, y);
    await expect(reader).toHaveAttribute("data-phase", "open");
    await reader.getByRole("button", { name: "Next pages" }).click();
    await expect(
      reader.getByRole("button", { name: "Previous pages" }),
    ).toBeEnabled();
    await expect(reader).toHaveAttribute("data-turning", "false");
    await page.keyboard.press("Escape");
    await expect(reader).toBeHidden();
    await expect(book).toBeFocused();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(position);
    await book.press("ArrowLeft");
    await book.press("ArrowUp");
    await book.press("Enter");
    await expect(reader).toHaveAttribute("data-phase", "open");
    await page.keyboard.press("Escape");
    await expect(reader).toBeHidden();
  });
}
