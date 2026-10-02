import { expect, test, type Page } from "@playwright/test";

async function scroll(page: Page, y: number) {
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    y,
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function positions(page: Page) {
  return page.evaluate(() => {
    const work = document.getElementById("work")!;
    const library = document.getElementById("library")!;
    const from = Number(work.dataset.viewportStart),
      to = Number(library.dataset.viewportStart);
    return {
      work: from,
      library: to,
      middle: (from + to) / 2 + 0.12 * innerHeight,
      end: to + innerHeight * 0.08,
    };
  });
}
async function ownership(page: Page, owner: "source" | "handoff" | "shelf") {
  const handoff = page.getByTestId("book-handoff");
  await expect(handoff).toHaveAttribute("data-owner", owner);
  await expect(handoff).toHaveAttribute(
    "data-visible",
    String(owner === "handoff"),
  );
  await expect(page.locator("#work [data-book-visible]")).toHaveAttribute(
    "data-book-visible",
    String(owner === "source"),
  );
  await expect(page.locator("#library [data-book-visible]")).toHaveAttribute(
    "data-book-visible",
    String(owner === "shelf"),
  );
  await expect(page.locator("body > canvas")).toHaveCount(0);
  await expect(handoff.locator("img")).toHaveCount(0);
}

test("one live 3D book travels and reverses only inside the work/library corridor", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  const p = await positions(page);
  await scroll(page, p.work);
  await expect(page.locator("#work [data-visible=true]")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("#library [data-book-visible]")).toHaveCount(1, {
    timeout: 30_000,
  });
  await ownership(page, "source");
  await info.attach("standalone", {
    body: await page.screenshot({ path: info.outputPath("standalone.png") }),
    contentType: "image/png",
  });
  for (const y of [p.middle, p.middle + 50, p.middle - 25, p.end - 2]) {
    await scroll(page, y);
    await ownership(page, "handoff");
    const progress = Number(
      await page.getByTestId("book-handoff").getAttribute("data-progress"),
    );
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  }
  await info.attach("arrival", {
    body: await page.screenshot({ path: info.outputPath("arrival.png") }),
    contentType: "image/png",
  });
  await scroll(page, p.end + 2);
  await ownership(page, "shelf");
  await info.attach("docked", {
    body: await page.screenshot({ path: info.outputPath("docked.png") }),
    contentType: "image/png",
  });
  await page
    .locator("#library button")
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator("#library button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Repeated fast jumps, slow wheel scrolling, a pause and a mid-flight reversal.
  for (let cycle = 0; cycle < 2; cycle++) {
    await scroll(page, p.middle);
    await ownership(page, "handoff");
    const before = await page
      .getByTestId("book-handoff")
      .getAttribute("data-progress");
    await page.waitForTimeout(250);
    expect(
      await page.getByTestId("book-handoff").getAttribute("data-progress"),
    ).toBe(before);
    await page.mouse.wheel(0, 35);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(p.middle);
    await page.mouse.wheel(0, -35);
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);
    await scroll(page, p.work);
    await ownership(page, "source");
    await scroll(page, p.end + 2);
    await ownership(page, "shelf");
  }
  await scroll(page, p.middle);
  await page.setViewportSize({ width: 1024, height: 768 });
  const resized = await positions(page);
  await scroll(page, resized.middle);
  await ownership(page, "handoff");
  await info.attach("resized", {
    body: await page.screenshot({ path: info.outputPath("resized.png") }),
    contentType: "image/png",
  });
  await page.reload();
  await expect(page.getByTestId("book-handoff")).toHaveAttribute(
    "data-owner",
    "handoff",
    { timeout: 30_000 },
  );
  await scroll(page, 0);
  await ownership(page, "source");
  await expect(page.getByTestId("book-handoff")).toBeHidden();
  await scroll(page, 100_000);
  await ownership(page, "shelf");
  await expect(page.getByTestId("book-handoff")).toBeHidden();
  await info.attach("footer", {
    body: await page.screenshot({ path: info.outputPath("footer.png") }),
    contentType: "image/png",
  });
  await scroll(page, (await positions(page)).work);
  await ownership(page, "source");
  await page.setViewportSize({ width: 390, height: 667 });
  await expect
    .poll(() =>
      page
        .locator("#work")
        .evaluate(
          (element) =>
            Number((element as HTMLElement).dataset.viewportHeight) -
            element.getBoundingClientRect().height,
        ),
    )
    .toBe(0);
  const mobile = await positions(page);
  await scroll(page, mobile.middle);
  await ownership(page, "handoff");
  await info.attach("mobile-transition", {
    body: await page.screenshot({
      path: info.outputPath("mobile-transition.png"),
    }),
    contentType: "image/png",
  });
  await scroll(page, mobile.end + 2);
  await ownership(page, "shelf");
  await scroll(page, mobile.work);
  await ownership(page, "source");
});

test("a delayed shelf holds the live book and recovers without another scroll", async ({
  page,
}) => {
  test.setTimeout(90_000);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/library-environment.glb", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  const p = await positions(page);
  await scroll(page, p.work);
  await expect(page.locator("#work [data-visible=true]")).toBeVisible({
    timeout: 30_000,
  });
  await scroll(page, p.end + 2);
  await expect(page.getByTestId("book-handoff")).toHaveAttribute(
    "data-visible",
    "true",
  );
  await expect(page.getByTestId("book-handoff")).toHaveAttribute(
    "data-progress",
    "0",
  );
  release();
  await expect(page.locator("#library [data-book-visible]")).toHaveCount(1, {
    timeout: 30_000,
  });
  await ownership(page, "shelf");
  await scroll(page, p.middle);
  await ownership(page, "handoff");
  await scroll(page, p.work);
  await ownership(page, "source");
});

test("reduced motion transfers ownership without a traveling canvas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  const p = await positions(page);
  await scroll(page, p.work);
  await expect(page.locator("#library [data-book-visible]")).toHaveCount(1, {
    timeout: 30_000,
  });
  await ownership(page, "source");
  await scroll(page, p.end);
  await ownership(page, "shelf");
  await expect(page.getByTestId("book-handoff").locator("canvas")).toHaveCount(
    0,
  );
  await scroll(page, p.work);
  await ownership(page, "source");
});

// Compare rendered pixels across ownership changes, without machine-specific
// golden files. A missing/duplicated book or a lighting flash changes large areas.
async function changedPixels(page: Page, before: Buffer, after: Buffer) {
  return page.evaluate(
    async ([a, b]) => {
      async function pixels(encoded: string) {
        const image = new Image();
        image.src = `data:image/png;base64,${encoded}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      }
      const [first, second] = await Promise.all([pixels(a), pixels(b)]);
      let changed = 0;
      for (let i = 0; i < first.length; i += 4) {
        if (
          Math.max(
            ...[0, 1, 2].map((c) => Math.abs(first[i + c] - second[i + c])),
          ) > 18
        )
          changed++;
      }
      return changed / (first.length / 4);
    },
    [before.toString("base64"), after.toString("base64")],
  );
}

test("rendered departure and docking remain continuous in both directions", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  const p = await positions(page);
  await scroll(page, p.work);
  await expect(page.locator("#library [data-book-visible]")).toHaveCount(1, {
    timeout: 30_000,
  });
  await ownership(page, "source");
  const sourceClip = (await page.locator("#work canvas").boundingBox())!;
  const source = await page.screenshot({ clip: sourceClip });
  await scroll(page, p.work + 1);
  await ownership(page, "handoff");
  const departure = await page.screenshot({ clip: sourceClip });
  expect(await changedPixels(page, source, departure)).toBeLessThan(0.01);
  // Previously the book stayed behind the incoming shelf until much later.
  await scroll(page, p.work + 60);
  await ownership(page, "handoff");
  await info.attach("early-lift", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  await scroll(page, p.end - 1);
  await ownership(page, "handoff");
  const shelf = (await page.locator("#library canvas").boundingBox())!;
  // Keep the pinned scene and book, excluding the entering footer and DOM controls.
  const clip = {
    x: shelf.x,
    y: shelf.y + 100,
    width: shelf.width,
    height: Math.min(shelf.height - 200, 650),
  };
  let previous = await page.screenshot({ clip });
  for (const y of [p.end + 1, p.end - 1, p.end + 1, p.end - 2, p.end + 2]) {
    await scroll(page, y);
    await ownership(page, y < p.end ? "handoff" : "shelf");
    const current = await page.screenshot({ clip });
    await info.attach(`handoff-${y}`, {
      body: current,
      contentType: "image/png",
    });
    expect(await changedPixels(page, previous, current)).toBeLessThan(0.01);
    previous = current;
  }
});

test("changing motion preference during late-load recovery stops travel immediately", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/library-environment.glb", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  const p = await positions(page);
  await scroll(page, p.work);
  await expect(page.locator("#work [data-book-visible]")).toHaveCount(1);
  await scroll(page, p.end + 1);
  await expect(page.getByTestId("book-handoff")).toHaveAttribute(
    "data-visible",
    "true",
  );
  release();
  await expect(page.locator("#library [data-book-visible]")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ownership(page, "shelf");
  await scroll(page, p.work);
  await ownership(page, "source");
});
