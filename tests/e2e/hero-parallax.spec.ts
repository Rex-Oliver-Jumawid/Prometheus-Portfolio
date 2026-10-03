import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [768, 768],
  [390, 667],
  [320, 568],
  [844, 390],
]) {
  test(`reveals the full character to his knees before the gallery at ${width}x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const hero = page.locator("#top");
    const stage = hero.locator("[data-hero-stage]");
    const figure = hero.locator('img[height="1595"]');
    const gallery = page.locator("#work");
    await expect(hero).toHaveAttribute("data-parallax-ready", "true");
    await expect(page.locator("main")).toHaveAttribute(
      "data-sticky-ready",
      "true",
    );
    await figure.evaluate((image: HTMLImageElement) => image.decode());
    await page.evaluate(() => document.fonts.ready);

    const original = (await figure.boundingBox())!;
    // The full asset preserves the original cropped hero's size and top anchor.
    const expectedWidth =
      width <= 640
        ? Math.min(width * 1.24, height * 0.74)
        : width <= 1000
          ? Math.min(width * 0.95, height * 1.15)
          : Math.min(width * 0.62, height * 1.1);
    const offset = width <= 1000 ? 25 : height * 0.045;
    expect(original.width).toBeCloseTo(expectedWidth, 0);
    expect(original.y).toBeCloseTo(
      height + offset - (expectedWidth * 718) / 986,
      0,
    );
    expect((await stage.boundingBox())!.height).toBe(height);
    const travel = (await hero.boundingBox())!.height - height;
    expect(travel).toBeGreaterThan(0);
    await expect
      .poll(async () => (await gallery.boundingBox())!.y)
      .toBeCloseTo(height + travel, 0);

    if (width === 1440 || width === 390) {
      await info.attach("initial", {
        body: await page.screenshot({ path: info.outputPath("initial.png") }),
        contentType: "image/png",
      });
    }
    for (const progress of [0.5, 1, 0.25, 0]) {
      const scroll = Math.round(travel * progress);
      await page.evaluate(
        (top) => window.scrollTo({ top, behavior: "instant" }),
        scroll,
      );
      await expect
        .poll(async () => (await figure.boundingBox())!.y)
        .toBeCloseTo(original.y - scroll, 0);
      // The second section cannot cover the character during the reveal.
      expect((await gallery.boundingBox())!.y).toBeGreaterThanOrEqual(
        height - 1,
      );
      const skyBottom = await hero
        .locator('img[src*="sky-scroll.webp"]')
        .evaluate((image) => image.getBoundingClientRect().bottom);
      expect(skyBottom).toBeGreaterThanOrEqual(height - 1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (progress === 1) {
        const knee =
          (await figure.boundingBox())!.y + (original.width * 1120) / 986;
        expect(Math.abs(knee - height)).toBeLessThan(1);
        if (width === 1440 || width === 390) {
          await info.attach("knees", {
            body: await page.screenshot({ path: info.outputPath("knees.png") }),
            contentType: "image/png",
          });
        }
      }
    }
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      travel + height * 0.6,
    );
    // Once inside the clouds, the gallery stays still beneath their reveal.
    await expect
      .poll(async () => (await gallery.boundingBox())!.y)
      .toBeCloseTo(0, 0);
    await expect
      .poll(async () => (await figure.boundingBox())!.y)
      .toBeCloseTo(original.y - travel, 0);
  });
}

test("changing motion preference removes the hold and scrolling transforms", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator("#top");
  await expect(hero).toHaveAttribute("data-parallax-ready", "true");
  await page.evaluate(() => window.scrollTo({ top: 180, behavior: "instant" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero).not.toHaveAttribute("data-parallax-ready", "true");
  await expect(hero).toHaveCSS("--hero-travel", "");
  expect((await hero.boundingBox())!.height).toBe(
    await page.evaluate(() => innerHeight),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(hero).toHaveAttribute("data-parallax-ready", "true");
  await expect
    .poll(async () => (await hero.boundingBox())!.height)
    .toBeGreaterThan(await page.evaluate(() => innerHeight));
});
