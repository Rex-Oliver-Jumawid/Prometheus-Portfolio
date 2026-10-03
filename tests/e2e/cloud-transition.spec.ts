import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [390, 667],
]) {
  test(`clouds reveal a stationary gallery at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const hero = page.locator("#top");
    const gallery = page.locator("#work");
    const clouds = page.locator("[data-cloud-transition]");
    await expect(hero).toHaveAttribute("data-parallax-ready", "true");
    await expect(page.locator("main")).toHaveAttribute(
      "data-sticky-ready",
      "true",
    );
    const heroHeight = Number(await hero.getAttribute("data-viewport-height"));
    const reveal = heroHeight - height;
    const lead = Math.min(reveal, height * 0.28);
    const distance = (lead + height) * 0.6;
    const start = heroHeight - distance;
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      start + distance * 0.2,
    );
    await expect(clouds).toHaveAttribute("data-active", "true");
    for (const progress of [0.4, 0.65, 0.85, 0.98, 0.65]) {
      const position = Math.round(start + distance * progress);
      await page.evaluate(
        (top) => window.scrollTo({ top, behavior: "instant" }),
        position,
      );
      await expect(clouds).toHaveAttribute("data-active", "true");
      await expect(gallery).toHaveCSS("mask-image", "none");
      await expect
        .poll(async () => (await gallery.boundingBox())!.y)
        .toBeCloseTo(0, 0);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBe(position);
    }
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      heroHeight,
    );
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(heroHeight, 0);
    await expect(clouds).not.toHaveAttribute("data-active", "true");
    await expect
      .poll(async () => (await gallery.boundingBox())!.y)
      .toBeCloseTo(0, 0);

    // Reverse the cloud entry to return to the hero's original layout.
    const returnPosition = Math.round(start + distance * 0.2);
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      returnPosition,
    );
    await expect(clouds).toHaveAttribute("data-active", "true");
    await expect
      .poll(async () => (await gallery.boundingBox())!.y)
      .toBeCloseTo(heroHeight - returnPosition, 0);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBe(returnPosition);
  });
}

test("reduced motion preserves native scrolling without automatic cloud navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
  await expect(page.locator("[data-cloud-transition]")).not.toHaveAttribute(
    "data-active",
    "true",
  );
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);
});
