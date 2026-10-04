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

    const navigation = page.getByRole("button", { name: "Open navigation" });
    const navigationY = (await navigation.boundingBox())!.y;
    const forwardFrames = new Map<number, string>();

    for (const progress of [
      0.03, 0.1, 0.25, 0.35, 0.4, 0.43, 0.46, 0.5, 0.6, 0.7, 0.9, 1, 0.46, 0.03,
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
        if (progress >= 0.5) await expect(stage).toHaveCSS("opacity", "0");
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
            minAlpha: number;
            meanLight: number;
            lightRange: number;
            meanAlpha: number;
            signature: string;
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
              let minAlpha = 255,
                alphaSum = 0,
                lightSum = 0;
              const lights: number[] = [];
              const signature: number[] = [];
              for (let index = 0; index < data.length; index += 4) {
                minAlpha = Math.min(minAlpha, data[index + 3]);
                alphaSum += data[index + 3];
                // Premultiplied luminance is meaningful in the opaque handoff.
                const light =
                  data[index] * 0.2126 +
                  data[index + 1] * 0.7152 +
                  data[index + 2] * 0.0722;
                lightSum += light;
                if (index % 64 === 0) lights.push(light);
                if (index % 4096 === 0)
                  signature.push(data[index], data[index + 3]);
              }
              lights.sort((a, b) => a - b);
              resolve({
                minAlpha,
                meanAlpha: alphaSum / (w * h),
                meanLight: lightSum / (w * h),
                lightRange:
                  lights[Math.floor(lights.length * 0.95)] -
                  lights[Math.floor(lights.length * 0.05)],
                signature: signature.join(","),
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
      if (progress >= 0.43 && progress <= 0.5) {
        // A scene fade is safe only when actual cloud pixels hide every part
        // of the hero. Coverage alone must not pass a flat brown/white screen.
        expect(pixels.minAlpha).toBeGreaterThanOrEqual(254);
        expect(pixels.meanLight).toBeGreaterThan(145);
        expect(pixels.meanLight).toBeLessThan(235);
        expect(pixels.lightRange).toBeGreaterThan(35);
      }
      if (progress === 0.6) {
        expect(pixels.meanAlpha).toBeGreaterThan(30);
        expect(pixels.meanAlpha).toBeLessThan(210);
      }
      if (progress === 0.9) expect(pixels.maxAlpha).toBe(0);
      if (progress < 1) {
        if (forwardFrames.has(progress)) {
          expect(pixels.signature).toBe(forwardFrames.get(progress));
        } else {
          forwardFrames.set(progress, pixels.signature);
        }
      }
      expect((await navigation.boundingBox())!.y).toBe(navigationY);
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

for (const failure of ["unavailable", "lost"] as const) {
  test(`cloud ${failure} context restores native section scrolling`, async ({
    page,
  }) => {
    if (failure === "unavailable") {
      await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          type,
          ...args
        ) {
          if (type === "webgl") return null;
          return getContext.call(this, type, ...args);
        } as typeof getContext;
      });
    }
    await page.goto("/");
    const layer = page.locator("[data-cloud-transition]");
    await expect(page.locator("#top")).toHaveAttribute(
      "data-parallax-ready",
      "true",
    );
    await page.evaluate(() =>
      window.scrollTo({ top: innerHeight * 1.3, behavior: "instant" }),
    );
    if (failure === "lost") {
      await expect(layer).toHaveAttribute("data-active", "true");
      await layer.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
        canvas
          .getContext("webgl")!
          .getExtension("WEBGL_lose_context")!
          .loseContext();
      });
    }
    await expect(layer).not.toHaveAttribute("data-active");
    await expect(layer).not.toHaveAttribute("data-scroll-start");
    await expect(page.locator("#top")).not.toHaveAttribute(
      "data-cloud-handoff",
    );
    await expect(page.locator("#work")).not.toHaveAttribute(
      "data-cloud-reveal",
    );
    await page.evaluate(() =>
      window.scrollTo({
        top: Number(document.getElementById("work")!.dataset.viewportStart),
        behavior: "instant",
      }),
    );
    await expect(page.locator("#work")).toBeInViewport();
  });
}
