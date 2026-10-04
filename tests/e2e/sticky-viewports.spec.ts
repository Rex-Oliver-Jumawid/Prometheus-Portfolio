import { expect, test } from "@playwright/test";

test("the library stays concealed until clouds can cover the scene exchange", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const gallery = page.locator("#work");
  await expect(page.locator("main.viewport-stack")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  await expect(gallery.locator(":scope > div > div").first()).toHaveCSS(
    "background-image",
    /library\.png/,
  );
  await expect(gallery.locator("video")).toHaveCount(0);
  const workStart = Number(await gallery.getAttribute("data-viewport-start"));
  const clouds = page.locator("[data-cloud-transition]");
  await expect(clouds).toHaveAttribute("data-scroll-start", /\d/);
  const start = Number(await clouds.getAttribute("data-scroll-start"));
  const distance =
    (Number(await clouds.getAttribute("data-scroll-end")) - start) / 0.75;
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    start + distance * 0.4,
  );
  await expect(gallery).toHaveCSS("visibility", "hidden");
  await expect(page.locator("[data-hero-stage]")).toHaveCSS("opacity", "1");
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    start + distance * 0.6,
  );
  await expect(gallery).toHaveAttribute("data-cloud-reveal", "true");
  await expect(gallery).toHaveCSS("visibility", "visible");
  await expect(clouds).toHaveAttribute("data-active", "true");
  await page.evaluate(
    (start) => window.scrollTo({ top: start, behavior: "instant" }),
    workStart,
  );
  await expect(clouds).not.toHaveAttribute("data-active");
  await expect(gallery).toHaveCSS("visibility", "visible");
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`opening the book mid-transition preserves sticky panels with ${reducedMotion} motion`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    await expect(page.locator("main.viewport-stack")).toHaveAttribute(
      "data-sticky-ready",
      "true",
    );
    const scroll = Math.round(
      Number(await page.locator("#work").getAttribute("data-viewport-start")) -
        450,
    );
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      scroll,
    );
    const hero = page.locator("#top [data-hero-stage]");
    const gallery = page.locator("#work");
    await expect.poll(async () => (await hero.boundingBox())!.y).toBe(0);
    if (reducedMotion === "no-preference") {
      await expect(page.locator("#top")).toHaveAttribute(
        "data-cloud-handoff",
        "true",
      );
      await expect.poll(async () => (await gallery.boundingBox())!.y).toBe(0);
    }
    const galleryTop = (await gallery.boundingBox())!.y;
    await expect(gallery).toHaveCSS("mask-image", "none");
    // Open without moving the scene, including while cloud cover owns the handoff.
    await page
      .getByRole("button", { name: "Read Furniture Odyssey" })
      .evaluate((element) => (element as HTMLElement).click());
    const reader = page.getByRole("dialog", { name: "Furniture Odyssey" });
    await expect(reader).toHaveAttribute("data-phase", "open");
    await expect.poll(async () => (await hero.boundingBox())!.y).toBe(0);
    await expect
      .poll(async () => (await gallery.boundingBox())!.y)
      .toBe(galleryTop);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll);
    await page.keyboard.press("Escape");
    await expect(reader).toBeHidden();
    await expect.poll(async () => (await hero.boundingBox())!.y).toBe(0);
    await expect
      .poll(async () => (await gallery.boundingBox())!.y)
      .toBe(galleryTop);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll);
  });
}

for (const [width, height] of [
  [1440, 900],
  [390, 667],
]) {
  test(`panels pin and cover their predecessors at ${width} by ${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const main = page.locator("main.viewport-stack");
    await expect(main).toHaveAttribute("data-sticky-ready", "true");
    const panels = await main
      .locator(":scope > section")
      .evaluateAll((sections) => {
        let start = 0;
        return sections.map((section) => {
          const height = section.getBoundingClientRect().height;
          const top = Number.parseFloat(getComputedStyle(section).top);
          const panel = { id: section.id, height, start, top };
          start += height;
          return panel;
        });
      });
    expect(panels.map((panel) => panel.id)).toEqual([
      "top",
      "work",
      "library",
      "contact",
    ]);
    for (const panel of panels) {
      expect(panel.height).toBeGreaterThan(0);
      await page.evaluate(
        (scroll) => window.scrollTo({ top: scroll, behavior: "instant" }),
        panel.start - panel.top + 1,
      );
      const maximumScroll = await page.evaluate(
        () => document.documentElement.scrollHeight - innerHeight,
      );
      // The short footer reaches the document end before its top can pin.
      const expectedTop = Math.max(panel.top, panel.start - maximumScroll);
      // Work's flow section supplies the hold distance; its inner viewport pins.
      const viewport =
        panel.id === "work"
          ? page.locator("#work > div").first()
          : page.locator(`#${panel.id}`);
      await expect
        .poll(async () => (await viewport.boundingBox())!.y)
        .toBeCloseTo(expectedTop, 0);
      expect(
        await page.evaluate(
          () =>
            document
              .elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
              ?.closest("section")?.id,
        ),
      ).toBe(panel.id);
    }
    await page.getByRole("link", { name: "Story", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("dialog", { name: "Prometheus" })
      .getByRole("link", { name: "Work", exact: true })
      .click();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator("#work")).toBeInViewport();
  });
}

test("direct section links keep their heading visible with sticky panels", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#library");
  await expect(page.locator("main.viewport-stack")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "The Prometheus Library" }),
  ).toBeInViewport();
  await page.evaluate(() => {
    window.location.hash = "contact";
  });
  await expect(
    page.getByRole("heading", {
      name: /build a system around how your business actually works/i,
    }),
  ).toBeInViewport();
});
