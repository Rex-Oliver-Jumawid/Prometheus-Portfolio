import { expect, test } from "@playwright/test";

const model = "**/models/projects/furniture-odyssey/book.glb";

test("homepage prepares the book at the hero, then warms the shelf without another book transfer", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('#work [data-prepared="true"]')).toHaveCount(1);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('#work [data-visible="true"]')).toHaveCount(1);
  await expect(page.locator('#library [data-ready="true"]')).toHaveCount(1, {
    timeout: 60_000,
  });
  const requests = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.endsWith("/book.glb"))
      .map((entry) => ({
        start: entry.startTime,
        transfer: (entry as PerformanceResourceTiming).transferSize,
      })),
  );
  // The two scenes have independent resource ownership for the existing handoff,
  // but the second consumes cached bytes and causes no second network download.
  expect(requests).toHaveLength(2);
  expect(requests.filter((request) => request.transfer > 0)).toHaveLength(1);
  await expect(page.locator("#work canvas")).toHaveCount(1);
  await expect(page.locator("#library canvas")).toHaveCount(1);
  await expect(page.getByText(/Opening the library/i)).toHaveCount(0);
});

test("a late model keeps a usable poster until the first 3D frame", async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(model, async (route) => {
    await held;
    await route.continue();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#work").scrollIntoViewIfNeeded();
  const poster = page.locator('#work img[src$="/cover.png"]');
  await expect(poster).toBeVisible();
  await expect(page.getByText("Loading 3D book.")).toHaveCSS(
    "clip-path",
    "inset(50%)",
  );
  await expect(page.getByText(/Opening the library/i)).toHaveCount(0);
  const book = page.getByRole("button", { name: "Read Furniture Odyssey" });
  await book.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Furniture Odyssey" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(poster).toBeVisible();
  release();
  await expect(book).toHaveAttribute("data-visible", "true");
  await expect(poster).toBeHidden();
  await expect(page.locator("#work canvas")).toHaveCount(1);
});

test("WebGL failure leaves the library background and readable static book", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (/webgl/.test(type)) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await page.locator("#work").scrollIntoViewIfNeeded();
  await expect(page.locator('#work img[src$="/cover.png"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Read Furniture Odyssey" })
    .press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Furniture Odyssey" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("#library").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "Read Furniture Odyssey in the gallery" }),
  ).toBeVisible();
  await expect(page.getByText(/Opening the library/i)).toHaveCount(0);
});
