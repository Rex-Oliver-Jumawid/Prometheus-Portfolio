import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [390, 844],
]) {
  test(`clouds bridge full viewport scenes at ${width}x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /webgl|shader|gl_invalid/i.test(message.text())
      )
        errors.push(message.text());
    });
    await page.goto("/");
    const layer = page.locator("[data-cloud-transition]");
    const hero = page.locator("#top");
    const stage = page.locator("[data-hero-stage]");
    const gallery = page.locator("#work");
    await expect(layer).toHaveAttribute("data-scroll-start", /\d/);
    const start = Number(await layer.getAttribute("data-scroll-start"));
    const distance =
      (Number(await layer.getAttribute("data-scroll-end")) - start) / 0.75;
    await expect(layer).not.toHaveAttribute("data-active");

    for (const progress of [
      0.03, 0.15, 0.3, 0.4, 0.49, 0.6, 0.75, 0.9, 1, 0.49, 0.03,
    ]) {
      await page.evaluate(
        (top) => window.scrollTo({ top, behavior: "instant" }),
        start + distance * progress,
      );
      if (progress < 1) {
        await expect(layer).toHaveAttribute("data-active", "true");
        await expect(hero).toHaveCSS("z-index", "3");
        await expect
          .poll(async () => (await gallery.boundingBox())!.y)
          .toBeCloseTo(0, 0);
        expect((await stage.boundingBox())!.y).toBe(0);
        await expect(stage).toHaveCSS("mask-image", "none");
        if (progress <= 0.4)
          await expect
            .poll(() =>
              stage.evaluate((el) => Number(getComputedStyle(el).opacity)),
            )
            .toBeCloseTo(1, 4);
        if (progress >= 0.6) await expect(stage).toHaveCSS("opacity", "0");
      }
      // Read the actual rendered alpha in the drawing frame, before WebGL's
      // non-preserved buffer is cleared. This catches rays missing either edge
      // and a base that is merely a faint haze despite spanning the viewport.
      const pixels = await page.evaluate(
        () =>
          new Promise<{
            minBottom: number;
            silhouetteRange: number;
            maxAlpha: number;
            error: number;
          }>((resolve) => {
            window.dispatchEvent(new Event("scroll"));
            requestAnimationFrame(() => {
              const canvas = document.querySelector<HTMLCanvasElement>(
                "[data-cloud-transition] canvas",
              )!;
              const gl = canvas.getContext("webgl")!;
              const { width: w, height: h } = canvas;
              const data = new Uint8Array(w * h * 4);
              gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
              let minBottom = 255,
                maxAlpha = 0;
              const tops: number[] = [];
              for (let x = 0; x < w; x++) {
                minBottom = Math.min(
                  minBottom,
                  data[(Math.floor(h * 0.04) * w + x) * 4 + 3],
                );
                let top = 0;
                for (let y = 0; y < h; y++) {
                  const alpha = data[(y * w + x) * 4 + 3];
                  maxAlpha = Math.max(maxAlpha, alpha);
                  if (alpha > 128) top = y;
                }
                tops.push(top / h);
              }
              resolve({
                minBottom,
                silhouetteRange: Math.max(...tops) - Math.min(...tops),
                maxAlpha,
                error: gl.getError(),
              });
            });
          }),
      );
      expect(pixels.error).toBe(0);
      if (progress === 0.03) {
        expect(pixels.minBottom).toBeGreaterThan(240);
        expect(pixels.silhouetteRange).toBeGreaterThan(0.025);
      }
      if (progress === 0.9) expect(pixels.maxAlpha).toBe(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await info.attach(`progress-${progress}`, {
        body: await page.screenshot({
          path: info.outputPath(`progress-${progress}.png`),
        }),
        contentType: "image/png",
      });
    }
    expect(
      await gallery.evaluate((el) =>
        Array.from(el.querySelectorAll("div")).some((child) =>
          getComputedStyle(child).backgroundImage.includes(
            "/assets/project-gallery/library.png",
          ),
        ),
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(layer).not.toHaveAttribute("data-active");
    await expect(hero).not.toHaveAttribute("data-cloud-handoff");
    await expect(stage).toHaveCSS("opacity", "1");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(layer).not.toHaveAttribute("data-scroll-start");
    await expect(hero).not.toHaveAttribute("data-parallax-ready");
    await page.evaluate(() =>
      window.scrollTo({ top: innerHeight, behavior: "instant" }),
    );
    await expect(layer).not.toHaveAttribute("data-active");
    await expect(gallery).toBeInViewport();
    expect(errors).toEqual([]);
  });
}
