import { expect, test } from "@playwright/test";

test("gallery uses the static reference background and typography without motion controls", async ({
  page,
}) => {
  const videoRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".webm")) videoRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/gallery");
  const gallery = page.locator("#work");
  await expect(gallery).toHaveCSS("background-color", "rgb(24, 26, 27)");
  await expect(gallery.locator("video")).toHaveCount(0);
  await expect(gallery.getByRole("button", { name: /motion/i })).toHaveCount(0);
  await expect(gallery.getByText(/Drag to turn and tilt/)).toHaveCount(0);
  await expect(
    gallery.getByRole("heading", { name: /Furniture Odyssey/ }),
  ).toHaveCSS("font-family", '"Libre Caslon Display", Georgia, serif');
  await expect(gallery.locator("h1 em")).toHaveCSS(
    "color",
    "rgb(169, 191, 194)",
  );
  expect(videoRequests).toEqual([]);
});

test("cover opens once and leaves no artwork over the reading pages", async ({
  page,
}) => {
  await page.goto("/gallery");
  const book = page.getByRole("button", { name: "Read Furniture Odyssey" });
  await book.press("Enter");
  const reader = page.getByRole("dialog", { name: "Furniture Odyssey" });
  await expect(reader.locator("img")).toHaveAttribute(
    "src",
    "/models/projects/furniture-odyssey/front-cover.png",
  );
  await expect(reader.locator("article img")).toHaveCount(0);
  const coverDimensions = await reader.locator("img").evaluate((image) => {
    const cover = image as HTMLImageElement;
    const stage = cover.parentElement!.parentElement!;
    return {
      width: cover.offsetWidth,
      height: cover.offsetHeight,
      stageWidth: stage.clientWidth,
      stageHeight: stage.clientHeight,
    };
  });
  expect(coverDimensions.width / coverDimensions.height).toBeCloseTo(
    1054 / 1493,
    2,
  );
  expect(
    Math.abs(coverDimensions.width - coverDimensions.stageWidth / 2),
  ).toBeLessThanOrEqual(1);
  expect(coverDimensions.height).toBe(coverDimensions.stageHeight);
  await expect(reader).toHaveAttribute("data-phase", "open");
  await expect(reader.locator("img")).toHaveCount(0);
  await reader.getByRole("button", { name: "Next pages" }).click();
  await expect(
    reader.getByRole("button", { name: "Next pages" }),
  ).toBeEnabled();
  await expect(reader.locator("img")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(reader).toBeHidden();
  await expect(book).toBeFocused();
});

for (const [width, height] of [
  [1440, 900],
  [390, 667],
  [844, 390],
]) {
  test(`book reader fits ${width} by ${height} and turns with side arrows`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/gallery");
    await page
      .getByRole("button", { name: "Read Furniture Odyssey" })
      .press("Enter");

    const reader = page.getByRole("dialog", { name: "Furniture Odyssey" });
    await expect(reader).toBeVisible();
    await expect(
      reader.getByRole("button", { name: "Close book" }),
    ).toHaveCount(0);
    await expect(reader.locator("article").first()).toBeFocused();
    await expect(reader.locator("img")).toHaveCount(0);
    await expect(reader.getByRole("link")).toHaveCount(0);
    await expect(reader.getByText(/^Pages /)).toHaveCount(0);
    const previous = reader.getByRole("button", { name: "Previous pages" });
    const next = reader.getByRole("button", { name: "Next pages" });
    await expect(previous).toBeDisabled();
    await expect(next).toBeInViewport({ ratio: 1 });
    await expect(previous).toBeInViewport({ ratio: 1 });
    expect(
      await reader.evaluate((element) => ({
        horizontal: element.scrollWidth > element.clientWidth,
        vertical: element.scrollHeight > element.clientHeight,
      })),
    ).toEqual({ horizontal: false, vertical: false });

    const papers = reader.locator("article");
    await expect(papers.first()).toHaveCSS("scrollbar-width", "none");
    await expect(papers.last()).toHaveCSS("scrollbar-width", "none");
    if (width === 390) {
      const rightPage = papers.last();
      await rightPage.focus();
      await rightPage.press("PageDown");
      await expect
        .poll(() => rightPage.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
    }
    const book = await papers.evaluateAll((elements) => {
      const left = elements[0].getBoundingClientRect();
      const right = elements[1].getBoundingClientRect();
      const viewport =
        elements[0].parentElement!.parentElement!.parentElement!.getBoundingClientRect();
      return {
        top: left.top,
        bottom: left.bottom,
        width: right.right - left.left,
        height: left.height,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      };
    });
    expect(book.width / book.height).toBeCloseTo((2 * 1054) / 1493, 2);
    expect(book.width).toBeLessThanOrEqual(book.viewportWidth + 1);
    expect(book.height).toBeLessThanOrEqual(book.viewportHeight + 1);
    expect(
      Math.min(
        book.viewportWidth - book.width,
        book.viewportHeight - book.height,
      ),
    ).toBeLessThan(1);
    const arrow = (await next.boundingBox())!;
    expect(arrow.y + arrow.height / 2).toBeCloseTo(
      (book.top + book.bottom) / 2,
      0,
    );
    if (width === 1440) {
      expect(
        await papers.evaluateAll((elements) =>
          elements.every(
            (element) => element.scrollHeight <= element.clientHeight,
          ),
        ),
      ).toBe(true);
    }

    await next.click();
    await expect(
      reader.getByRole("heading", { name: "From selection to order." }),
    ).toBeVisible();
    await previous.click();
    await expect(previous).toBeDisabled();
    if (width === 1440) {
      await papers.first().click();
      await expect(reader).toBeVisible();
      const emptySpace = await papers.first().evaluate((element) => {
        const viewport =
          element.parentElement!.parentElement!.parentElement!.getBoundingClientRect();
        return { x: viewport.left + 2, y: viewport.top + viewport.height / 2 };
      });
      await page.mouse.click(emptySpace.x, emptySpace.y);
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(reader).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Read Furniture Odyssey" }),
    ).toBeFocused();
  });
}
