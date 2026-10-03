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
    await page.addInitScript(() => {
      const original = WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays = function (...args) {
        original.apply(this, args);
        if (
          !(this.canvas instanceof HTMLCanvasElement) ||
          !this.canvas.closest("[data-cloud-transition]")
        )
          return;
        const samples: number[][] = [];
        for (const y of [0.02, 0.25, 0.5, 0.75, 0.98]) {
          for (const x of [0.02, 0.25, 0.5, 0.75, 0.98]) {
            const pixel = new Uint8Array(4);
            this.readPixels(
              Math.floor(this.drawingBufferWidth * x),
              Math.floor(this.drawingBufferHeight * y),
              1,
              1,
              this.RGBA,
              this.UNSIGNED_BYTE,
              pixel,
            );
            samples.push(Array.from(pixel));
          }
        }
        (window as unknown as { cloudPixels: number[][] }).cloudPixels =
          samples;
      };
    });
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
    const distance = (lead + height) * 0.9;
    const start = heroHeight - distance;
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      start + distance * 0.2,
    );
    await expect(clouds).toHaveAttribute("data-active", "true");
    for (const progress of [0.4, 0.48, 0.65, 0.85, 0.98, 0.65]) {
      const position = Math.round(start + distance * progress);
      await page.evaluate(
        (top) => window.scrollTo({ top, behavior: "instant" }),
        position,
      );
      await expect(clouds).toHaveAttribute("data-active", "true");
      if (progress === 0.4) {
        // The fly-through volume must render opaque gold clouds.
        await expect
          .poll(() =>
            page.evaluate(() => {
              const pixels =
                (window as unknown as { cloudPixels?: number[][] })
                  .cloudPixels ?? [];
              return pixels.some(([r, g, b, a]) => a > 150 && r > g && g > b);
            }),
          )
          .toBe(true);
        // Full cloud coverage must hide the incoming gallery, including corners.
        await expect
          .poll(() =>
            page.evaluate(() => {
              const pixels =
                (window as unknown as { cloudPixels?: number[][] })
                  .cloudPixels ?? [];
              return (
                pixels.length === 25 && pixels.every((pixel) => pixel[3] >= 250)
              );
            }),
          )
          .toBe(true);
      }
      if (progress === 0.65) {
        // WebGL samples run bottom to top: the clearing bank belongs overhead.
        await expect
          .poll(() =>
            page.evaluate(() => {
              const pixels =
                (window as unknown as { cloudPixels?: number[][] })
                  .cloudPixels ?? [];
              if (pixels.length !== 25) return false;
              const bottom = pixels
                .slice(0, 5)
                .reduce((sum, pixel) => sum + pixel[3], 0);
              const top = pixels
                .slice(20)
                .reduce((sum, pixel) => sum + pixel[3], 0);
              return top > bottom && bottom === 0;
            }),
          )
          .toBe(true);
      }
      if (progress >= 0.85) {
        // The final gallery reveal must contain no residual cloud wisps.
        await expect
          .poll(() =>
            page.evaluate(() => {
              const pixels =
                (window as unknown as { cloudPixels?: number[][] })
                  .cloudPixels ?? [];
              return (
                pixels.length > 0 && pixels.every((pixel) => pixel[3] === 0)
              );
            }),
          )
          .toBe(true);
      }
      if (progress < 0.45) {
        await expect(gallery).not.toHaveAttribute("data-cloud-reveal", "true");
      } else {
        await expect(gallery).toHaveCSS("mask-image", "none");
        await expect
          .poll(async () => (await gallery.boundingBox())!.y)
          .toBeCloseTo(0, 0);
      }
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

test("wheel scrolling slows only while crossing the clouds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  await expect(page.locator("html")).toHaveClass(/(?:^|\s)lenis(?:\s|$)/);
  const range = await page.locator("#top").evaluate((hero) => {
    const height = innerHeight;
    const heroHeight = Number((hero as HTMLElement).dataset.viewportHeight);
    const distance =
      (Math.min(heroHeight - height, height * 0.28) + height) * 0.9;
    return {
      start: heroHeight - distance,
      position: Math.round(heroHeight - distance * 0.65),
      after: Math.round(heroHeight - distance * 0.15),
    };
  });
  const clouds = page.locator("[data-cloud-transition]");
  async function wheelDistance(top: number, inClouds: boolean) {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      top,
    );
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(top);
    if (inClouds) await expect(clouds).toHaveAttribute("data-active", "true");
    else await expect(clouds).not.toHaveAttribute("data-active", "true");
    await page.mouse.move(100, 450);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(top);
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);
    return (await page.evaluate(() => scrollY)) - top;
  }
  const before = await wheelDistance(0, false);
  const approach = await wheelDistance(Math.round(range.start) - 30, false);
  expect(approach / before).toBeGreaterThan(0.8);
  expect(approach / before).toBeLessThan(0.98);
  const during = await wheelDistance(range.position, true);
  expect(before).toBeCloseTo(120, 0);
  expect(during / before).toBeGreaterThan(0.3);
  expect(during / before).toBeLessThan(0.4);
  const after = await wheelDistance(range.after, true);
  expect(after).toBeCloseTo(before, 0);
});

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
