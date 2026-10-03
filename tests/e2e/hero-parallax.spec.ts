import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [768, 768],
  [390, 667],
  [320, 568],
  [844, 390],
]) {
  test(`reveals Prometheus through the foot tip before the gallery at ${width}x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const hero = page.locator("#top");
    const stage = hero.locator("[data-hero-stage]");
    const figure = hero.locator("[data-hero-figure] img");
    const gallery = page.locator("#work");

    await expect(hero).toHaveAttribute("data-parallax-ready", "true");
    await expect(page.locator("main")).toHaveAttribute(
      "data-sticky-ready",
      "true",
    );
    await figure.evaluate((image: HTMLImageElement) => image.decode());
    await page.evaluate(() => document.fonts.ready);

    const original = (await figure.boundingBox())!;
    expect((await stage.boundingBox())!.height).toBe(height);

    await expect
      .poll(async () => (await hero.boundingBox())!.height - height)
      .toBeGreaterThan(0);

    const travel = (await hero.boundingBox())!.height - height;
    const expectedTravel = Math.max(
      0,
      original.y + original.height - height,
    );
    expect(travel).toBeCloseTo(expectedTravel, 0);

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

      // Keep section two outside the viewport until the full figure reveal ends.
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
        const finalFigure = (await figure.boundingBox())!;
        expect(finalFigure.y + finalFigure.height).toBeCloseTo(height, 0);

        if (width === 1440 || width === 390) {
          await info.attach("foot-stop", {
            body: await page.screenshot({
              path: info.outputPath("foot-stop.png"),
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

    const finalFigure = (await figure.boundingBox())!;
    expect(finalFigure.y + finalFigure.height).toBeCloseTo(height, 0);
  });
}

test("the measured hero scroll distance completes the figure reveal before section two enters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const hero = page.locator("#top");
  await expect(hero).toHaveAttribute("data-parallax-ready", "true");

  const travel = (await hero.boundingBox())!.height - 900;
  expect(travel).toBeGreaterThan(0);

  for (const progress of [0.5, 1]) {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      travel * progress,
    );
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
