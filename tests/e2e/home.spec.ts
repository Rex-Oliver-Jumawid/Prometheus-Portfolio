import { expect, test } from "@playwright/test";

test("the editorial action supports hover, focus, and reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const action = page.getByRole("link", { name: "Explore our work" });
  const arrow = action.locator("span");
  await action.hover();
  await expect
    .poll(() =>
      arrow.evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).e,
      ),
    )
    .toBe(5);
  await action.focus();
  await expect(action).toHaveCSS("outline-style", "solid");
  const brand = page.locator('a[aria-label="Prometheus home"]');
  const ribbon = brand.locator("span").first();
  const fillScale = () =>
    ribbon.evaluate(
      (element) =>
        new DOMMatrix(getComputedStyle(element, "::before").transform).a,
    );
  await expect.poll(fillScale).toBe(0);
  const original = await ribbon.boundingBox();
  await brand.hover();
  await expect.poll(fillScale).toBe(1);
  expect(await ribbon.boundingBox()).toEqual(original);
  await expect(brand).toHaveText("");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(action).toHaveCSS("transition-duration", "0s");
  await expect(arrow).toHaveCSS("transition-duration", "0s");
});

test("preserves menu Escape handling and section navigation", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Prometheus" });
  await expect(
    dialog.getByRole("link", { name: "Work", exact: true }),
  ).toHaveAttribute("href", "#work");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await dialog.getByRole("link", { name: "Library", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#library$/);
  await expect(
    page.getByRole("heading", { name: "The Prometheus Library" }),
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
  test(`fits the editorial hero and left menu at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator("#top");
    expect((await hero.boundingBox())!.height).toBe(height);
    await expect(hero.getByRole("article")).toHaveCount(0);
    await expect(hero.getByRole("complementary")).toHaveCount(0);
    await expect(hero.locator('img[src*="sky.webp"]')).toHaveCSS(
      "object-fit",
      "cover",
    );
    await expect(hero.locator('img[height="718"]')).toHaveAttribute(
      "src",
      /figure\.webp/,
    );
    const heading = hero.getByRole("heading", { level: 1 });
    const action = hero.getByRole("link", { name: "Explore our work" });
    for (const element of [heading, hero.locator("p").first(), action]) {
      await expect(element).toBeInViewport({ ratio: 1 });
    }
    const lines = await heading.evaluate((element) =>
      Array.from(element.children).map((child) => {
        const range = document.createRange();
        range.selectNodeContents(child);
        const rect = range.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      }),
    );
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.left).toBeGreaterThanOrEqual(0);
      expect(line.right).toBeLessThanOrEqual(width);
    }
    expect(lines[1].top).toBeGreaterThan(lines[0].top);
    const paragraphLines = await hero
      .locator("p")
      .first()
      .evaluate(
        (element) =>
          element.getBoundingClientRect().height /
          parseFloat(getComputedStyle(element).lineHeight),
      );
    expect(paragraphLines).toBeLessThanOrEqual(3.1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    const trigger = page.getByRole("button", { name: "Open navigation" });
    const brand = page.locator('a[aria-label="Prometheus home"]');
    const triggerBounds = (await trigger.boundingBox())!;
    const brandBounds = (await brand.boundingBox())!;
    const bannerBounds = (await brand.locator("span").first().boundingBox())!;
    expect(bannerBounds.y).toBe(0);
    expect(triggerBounds.y + triggerBounds.height / 2).toBeCloseTo(
      bannerBounds.height / 2,
      0,
    );
    expect(brandBounds.y).toBe(0);
    expect(brandBounds.x + brandBounds.width).toBeLessThan(triggerBounds.x);
    expect(triggerBounds.width).toBeGreaterThanOrEqual(44);
    expect(triggerBounds.height).toBeGreaterThanOrEqual(44);
    expect(brandBounds.x + brandBounds.width).toBeLessThan(width);
    await expect(trigger).toHaveCSS("border-top-style", "solid");
    await expect(trigger.locator("span > span")).toHaveCount(3);
    const originalBrand = await brand.elementHandle();
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Prometheus" });
    const glass = page.locator("[data-navigation-glass]");
    await expect(glass).toHaveCSS(
      "overflow",
      "hidden",
    );
    await expect(dialog).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    if (width > 640) {
      expect((await dialog.boundingBox())!.width).toBeCloseTo(width * 0.6, 0);
      expect((await glass.boundingBox())!.width).toBeCloseTo(width * 0.6, 0);
    } else {
      expect((await dialog.boundingBox())!.width).toBeCloseTo(width, 0);
      expect((await glass.boundingBox())!.width).toBeCloseTo(width, 0);
    }
    const glassBackdrop = page.locator(
      "[data-navigation-glass-backdrop]",
    );
    await expect(glassBackdrop).toHaveCount(1);
    expect(
      await glassBackdrop
        .locator("span")
        .first()
        .evaluate((element) =>
          getComputedStyle(element).filter.includes("blur(46px)"),
        ),
    ).toBe(true);
    const primaryNavigation = dialog.getByRole("navigation", {
      name: "Primary navigation",
    });
    await expect(primaryNavigation.getByRole("link")).toHaveCount(4);

    const storyLink = primaryNavigation.getByRole("link", {
      name: "Story",
      exact: true,
    });
    const libraryLink = primaryNavigation.getByRole("link", {
      name: "Library",
      exact: true,
    });
    await storyLink.hover();
    const storyIndicatorOffset = await primaryNavigation.evaluate((element) =>
      parseFloat(
        getComputedStyle(element).getPropertyValue("--nav-indicator-offset"),
      ),
    );
    await libraryLink.hover();
    const libraryIndicatorOffset = await primaryNavigation.evaluate((element) =>
      parseFloat(
        getComputedStyle(element).getPropertyValue("--nav-indicator-offset"),
      ),
    );
    expect(libraryIndicatorOffset).toBeGreaterThan(storyIndicatorOffset);
    await expect(brand).toHaveCount(1);
    expect(
      await originalBrand!.evaluate((element) => element.isConnected),
    ).toBe(true);
    await expect(brand).toHaveCSS("color", "rgb(220, 61, 60)");
    await expect(brand).toBeInViewport({ ratio: 1 });
    const openBrandBounds = (await brand.boundingBox())!;
    expect(openBrandBounds.x).toBeCloseTo(brandBounds.x, 0);
    expect(openBrandBounds.y).toBeCloseTo(brandBounds.y, 0);
    expect(openBrandBounds.width).toBeCloseTo(brandBounds.width, 0);
    expect(openBrandBounds.height).toBeCloseTo(brandBounds.height, 0);
    expect(
      await brand.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          document
            .elementFromPoint(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2,
            )
            ?.closest('a[aria-label="Prometheus home"]') === element
        );
      }),
    ).toBe(true);
    const close = page.getByRole("button", { name: "Close navigation" });
    await expect(close).toHaveCount(1);
    expect(
      await trigger.evaluate((element) => element.isConnected),
    ).toBe(true);
    const closeBounds = (await close.boundingBox())!;
    expect(closeBounds.x).toBeCloseTo(triggerBounds.x, 0);
    expect(closeBounds.y).toBeCloseTo(triggerBounds.y, 0);
    expect(closeBounds.width).toBeCloseTo(triggerBounds.width, 0);
    expect(closeBounds.height).toBeCloseTo(triggerBounds.height, 0);
    await expect(dialog.getByRole("button", { name: "Close navigation" })).toHaveCount(0);
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
    await action.click();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator("#work")).toBeInViewport();
  });
}
