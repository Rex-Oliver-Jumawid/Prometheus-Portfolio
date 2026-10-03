import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [768, 768],
  [390, 667],
  [320, 568],
  [844, 390],
]) {
  test(`keeps the head clear over two screens of parallax before the gallery at ${width}x${height}`, async ({
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
    expect(travel).toBeCloseTo(height * 2, 0);
    const reveal = Math.min(
      (original.width * 402) / 986 + offset,
      Math.max(0, original.y + (original.width * 170) / 986 - height * 0.35),
    );
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
        .toBeCloseTo(original.y - (reveal * scroll) / travel, 0);
      // Keep the second section below the viewport for the entire two-screen hold.
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
        const head =
          (await figure.boundingBox())!.y + (original.width * 170) / 986;
        expect(head).toBeGreaterThanOrEqual(height * 0.35 - 1);
        expect(head).toBeLessThanOrEqual(height * 0.35 + 1);
        if (width === 1440 || width === 390) {
          await info.attach("head-stop", {
            body: await page.screenshot({
              path: info.outputPath("head-stop.png"),
            }),
            contentType: "image/png",
          });
        }
      }
    }
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      travel + 120,
    );
    await expect
      .poll(async () =>
        Math.abs((await gallery.boundingBox())!.y - (height - 120)),
      )
      .toBeLessThan(1);
    await expect
      .poll(async () => (await figure.boundingBox())!.y)
      .toBeCloseTo(original.y - reveal, 0);
  });
}

test("two screen-sized wheel movements complete the reveal before section two enters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const hero = page.locator("#top");
  await expect(hero).toHaveAttribute("data-parallax-ready", "true");
  for (const progress of [0.5, 1]) {
    await page.mouse.wheel(0, 900);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(progress * 1800, 0);
    await expect
      .poll(() =>
        hero.evaluate((element) =>
          Number(element.style.getPropertyValue("--hero-progress")),
        ),
      )
      .toBeCloseTo(progress, 2);
    expect(
      (await page.locator("#work").boundingBox())!.y,
    ).toBeGreaterThanOrEqual(899);
  }
});

test("changing motion preference removes the hold and scrolling transforms", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator("#top");
  await expect(hero).toHaveAttribute("data-parallax-ready", "true");
  await page.evaluate(() => window.scrollTo({ top: 180, behavior: "instant" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero).not.toHaveAttribute("data-parallax-ready", "true");
  await expect(hero).toHaveCSS("--hero-progress", "");
  expect((await hero.boundingBox())!.height).toBe(
    await page.evaluate(() => innerHeight),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(hero).toHaveAttribute("data-parallax-ready", "true");
  await expect
    .poll(async () => (await hero.boundingBox())!.height)
    .toBeGreaterThan(await page.evaluate(() => innerHeight));
});
