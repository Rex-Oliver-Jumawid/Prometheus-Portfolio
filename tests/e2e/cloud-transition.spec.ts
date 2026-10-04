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
      0.03, 0.15, 0.3, 0.4, 0.49, 0.52, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 0.49, 0.4,
      0.03,
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
        if (progress < 0.48) {
          await expect(gallery).toHaveCSS("visibility", "hidden");
          await expect(gallery).not.toHaveAttribute("data-cloud-reveal");
        } else {
          await expect(gallery).toHaveCSS("visibility", "visible");
          await expect(gallery).toHaveAttribute("data-cloud-reveal", "true");
        }
        if (progress <= 0.52)
          await expect
            .poll(() =>
              stage.evaluate((el) => Number(getComputedStyle(el).opacity)),
            )
            .toBeCloseTo(1, 4);
        if (progress >= 0.75) await expect(stage).toHaveCSS("opacity", "0");
      }
      // Read the actual rendered alpha in the drawing frame, before WebGL's
      // non-preserved buffer is cleared. This catches rays missing either edge
      // and a base that is merely a faint haze despite spanning the viewport.
      const pixels = await page.evaluate(
        () =>
          new Promise<{
            minBottom: number;
            minViewport: number;
            lightRange: number;
            warm: boolean;
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
                minViewport = 255,
                maxAlpha = 0,
                minLight = 255,
                maxLight = 0;
              let warm = true;
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
                  minViewport = Math.min(minViewport, alpha);
                  if (alpha > 240) {
                    const pixel = (y * w + x) * 4;
                    minLight = Math.min(minLight, data[pixel]);
                    maxLight = Math.max(maxLight, data[pixel]);
                    warm &&=
                      data[pixel] >= data[pixel + 1] &&
                      data[pixel + 1] > data[pixel + 2];
                  }
                  if (alpha > 128) top = y;
                }
                tops.push(top / h);
              }
              resolve({
                minBottom,
                minViewport,
                lightRange: maxLight - minLight,
                warm,
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
      if (progress === 0.9) expect(pixels.maxAlpha).toBeGreaterThan(0);
      if (progress >= 0.49 && progress <= 0.8) {
        // Every pixel hides the scene exchange, including the upper corners.
        expect(pixels.minViewport).toBe(255);
        // Opaque coverage still has lit billows, rather than a flat brown veil.
        expect(pixels.lightRange).toBeGreaterThan(35);
        expect(pixels.warm).toBe(true);
      }
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

  test(`slow wheel handoff and reverse scroll at ${width}x${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const layer = page.locator("[data-cloud-transition]");
    await expect(layer).toHaveAttribute("data-scroll-start", /\d/);
    const start = Number(await layer.getAttribute("data-scroll-start"));
    const distance =
      (Number(await layer.getAttribute("data-scroll-end")) - start) / 0.75;
    const milestones = [0.03, 0.15, 0.3, 0.4, 0.49, 0.6, 0.75, 0.85, 0.95, 1];
    let milestone = 0;
    let reached = false;
    for (const direction of [1, -1]) {
      reached = false;
      for (let step = 0; step < 150; step++) {
        await page.mouse.wheel(0, direction * 100);
        // Small, spaced wheel events exercise Lenis and intermediate painted frames.
        await page.waitForTimeout(100);
        const state = await page.evaluate(
          () =>
            new Promise<{
              y: number;
              heroOpacity: number;
              stageY: number;
              galleryY: number;
              galleryVisible: string;
              handoff?: string;
              overflow: boolean;
            }>((resolve) => {
              // Sample the painted state after the scroll-driven update, rather
              // than mixing the next native scroll position with the previous frame.
              window.dispatchEvent(new Event("scroll"));
              requestAnimationFrame(() =>
                resolve({
                  y: scrollY,
                  heroOpacity: Number(
                    getComputedStyle(
                      document.querySelector("[data-hero-stage]")!,
                    ).opacity,
                  ),
                  stageY: document
                    .querySelector("[data-hero-stage]")!
                    .getBoundingClientRect().y,
                  galleryY: document
                    .querySelector("#work")!
                    .getBoundingClientRect().y,
                  galleryVisible: getComputedStyle(
                    document.querySelector("#work")!,
                  ).visibility,
                  handoff:
                    document.querySelector<HTMLElement>("#top")!.dataset
                      .cloudHandoff,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                }),
              );
            }),
        );
        const progress = (state.y - start) / distance;
        expect(state.overflow).toBe(false);
        if (progress > 0 && progress < 1) {
          expect(state.handoff).toBe("true");
          expect(state.stageY).toBeCloseTo(0, 0);
          expect(state.galleryY).toBeCloseTo(0, 0);
          if (progress < 0.47) expect(state.galleryVisible).toBe("hidden");
          if (progress < 0.52) expect(state.heroOpacity).toBe(1);
          if (progress > 0.7) expect(state.heroOpacity).toBe(0);
        }
        if (
          direction === 1 &&
          milestone < milestones.length &&
          progress >= milestones[milestone]
        ) {
          await info.attach(`wheel-${milestones[milestone]}`, {
            body: await page.screenshot({
              path: info.outputPath(`wheel-${milestones[milestone]}.png`),
            }),
            contentType: "image/png",
          });
          milestone++;
        }
        if (
          (direction === 1 && progress >= 1.02) ||
          (direction === -1 && progress <= -0.02)
        ) {
          reached = true;
          break;
        }
      }
      expect(reached).toBe(true);
    }
    await expect(layer).not.toHaveAttribute("data-active");
    await expect(page.locator("[data-hero-stage]")).toHaveCSS("opacity", "1");
  });
}
