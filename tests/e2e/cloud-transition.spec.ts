import { expect, test, type Page } from "@playwright/test";

type CloudFrame = {
  progress: number;
  hash: number;
  minAlpha: number;
  meanAlpha: number;
  error: number;
};

async function scrollToProgress(page: Page, progress: number) {
  await expect
    .poll(() =>
      page.evaluate(async (progress) => {
        // Lazy image loading can update the range after the initial layout.
        const layer = document.querySelector<HTMLElement>(
          "[data-cloud-transition]",
        )!;
        const start = Number(layer.dataset.scrollStart);
        const distance = (Number(layer.dataset.scrollEnd) - start) / 0.75;
        window.scrollTo({
          top: start + distance * progress,
          behavior: "instant",
        });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return Math.abs(
          ((window as Window & { cloudFrame?: CloudFrame }).cloudFrame
            ?.progress ?? -1) - progress,
        );
      }, progress),
    )
    .toBeLessThan(0.002);
  if (progress >= 0.45) {
    await expect(page.locator("#work")).toHaveAttribute(
      "data-cloud-reveal",
      "true",
    );
  } else {
    await expect(page.locator("#work")).not.toHaveAttribute(
      "data-cloud-reveal",
    );
  }
  return page.evaluate(
    () => (window as Window & { cloudFrame?: CloudFrame }).cloudFrame!,
  );
}

for (const [width, height] of [
  [1440, 900],
  [390, 667],
]) {
  test(`cloud shader covers the dive and reverses the reveal at ${width}x${height}`, async ({
    page,
  }) => {
    // Read the real framebuffer immediately after each draw, before WebGL clears
    // it. Compare the same scroll position in both directions, without goldens.
    await page.addInitScript(() => {
      const draw = WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays = function (...args) {
        draw.apply(this, args);
        const canvas = this.canvas;
        if (
          !(canvas instanceof HTMLCanvasElement) ||
          !canvas.closest("[data-cloud-transition]")
        )
          return;
        const program = this.getParameter(this.CURRENT_PROGRAM) as WebGLProgram;
        const progress = this.getUniform(
          program,
          this.getUniformLocation(program, "uProgress")!,
        ) as number;
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        this.readPixels(
          0,
          0,
          canvas.width,
          canvas.height,
          this.RGBA,
          this.UNSIGNED_BYTE,
          pixels,
        );
        let hash = 2166136261,
          minAlpha = 255,
          alpha = 0;
        for (let i = 0; i < pixels.length; i++) {
          hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
          if (i % 4 === 3) {
            minAlpha = Math.min(minAlpha, pixels[i]);
            alpha += pixels[i];
          }
        }
        (window as Window & { cloudFrame?: CloudFrame }).cloudFrame = {
          progress,
          hash,
          minAlpha,
          meanAlpha: alpha / (pixels.length / 4),
          error: this.getError(),
        };
      };
    });
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const layer = page.locator("[data-cloud-transition]");
    const gallery = page.locator("#work");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("main")).toHaveAttribute(
      "data-sticky-ready",
      "true",
    );
    await expect(page.locator("#top")).toHaveAttribute(
      "data-parallax-ready",
      "true",
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const hero = document.getElementById("top")!;
          const work = document.getElementById("work")!;
          return (
            Number(work.dataset.viewportStart) ===
            Number(hero.dataset.viewportStart) +
              hero.getBoundingClientRect().height
          );
        }),
      )
      .toBe(true);
    await expect(layer).toHaveAttribute("data-scroll-end", /\d/);

    const dive = await scrollToProgress(page, 0.3);
    expect(dive.error).toBe(0);
    expect(dive.minAlpha).toBeGreaterThan(245);
    await expect(layer).toBeVisible();

    const reveal = await scrollToProgress(page, 0.6);
    expect(reveal.error).toBe(0);
    expect(reveal.meanAlpha).toBeGreaterThan(0);
    expect(reveal.meanAlpha).toBeLessThan(150);
    await expect(gallery).toHaveAttribute("data-cloud-reveal", "true");
    await expect
      .poll(async () => (await gallery.boundingBox())!.y)
      .toBeCloseTo(0, 0);
    expect((await scrollToProgress(page, 0.7)).meanAlpha).toBeLessThan(
      reveal.meanAlpha,
    );
    expect((await scrollToProgress(page, 0.6)).hash).toBe(reveal.hash);
    expect((await scrollToProgress(page, 0.3)).hash).toBe(dive.hash);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(layer).toBeHidden();
    await expect(layer).not.toHaveAttribute("data-scroll-end");
    await expect(gallery).not.toHaveAttribute("data-cloud-reveal");
    await expect(gallery).toHaveCSS("--gallery-cloud-offset", "");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(layer).toHaveAttribute("data-scroll-end", /\d/);
    await scrollToProgress(page, 0.6);
    await layer.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      canvas
        .getContext("webgl")!
        .getExtension("WEBGL_lose_context")!
        .loseContext();
    });
    await expect(layer).toBeHidden();
    await expect(layer).not.toHaveAttribute("data-scroll-end");
    await expect(gallery).not.toHaveAttribute("data-cloud-reveal");
  });
}
