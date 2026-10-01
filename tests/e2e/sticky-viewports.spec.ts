import { expect, test } from "@playwright/test";

test("the static gallery background blends into the hero and becomes solid when pinned", async ({
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
  await expect(gallery).toHaveCSS("background-color", "rgb(24, 26, 27)");
  await expect(gallery.locator("video")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 810, behavior: "instant" }));
  await expect
    .poll(() =>
      gallery.evaluate((element) =>
        Number.parseFloat(
          getComputedStyle(element).getPropertyValue("--gallery-seam"),
        ),
      ),
    )
    .toBeCloseTo(56, 1);
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  await expect(gallery).toHaveCSS("--gallery-seam", "0px");
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
    await page.evaluate(() =>
      window.scrollTo({ top: 450, behavior: "instant" }),
    );
    const hero = page.locator("#top");
    const gallery = page.locator("#work");
    await expect.poll(async () => (await hero.boundingBox())!.y).toBe(0);
    const galleryTop = (await gallery.boundingBox())!.y;
    await expect
      .poll(() =>
        gallery.evaluate((element) =>
          Number.parseFloat(
            getComputedStyle(element).getPropertyValue("--gallery-seam"),
          ),
        ),
      )
      .toBeCloseTo(252, 1);
    await expect(gallery).not.toHaveCSS("mask-image", "none");
    // Activate the partially visible book without scrolling it into view first.
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
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(450);
    await page.keyboard.press("Escape");
    await expect(reader).toBeHidden();
    await expect.poll(async () => (await hero.boundingBox())!.y).toBe(0);
    await expect
      .poll(async () => (await gallery.boundingBox())!.y)
      .toBe(galleryTop);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(450);
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
      "approach",
      "capabilities",
      "contact",
    ]);
    for (const panel of panels) {
      expect(panel.height).toBeGreaterThanOrEqual(height);
      await page.evaluate(
        (scroll) => window.scrollTo({ top: scroll, behavior: "instant" }),
        panel.start - panel.top + 1,
      );
      await expect
        .poll(async () => (await page.locator(`#${panel.id}`).boundingBox())!.y)
        .toBeCloseTo(panel.top, 0);
      expect(
        await page.evaluate(
          () =>
            document
              .elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
              ?.closest("section")?.id,
        ),
      ).toBe(panel.id);
    }
    await page.getByRole("link", { name: "Back to top", exact: false }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.getByRole("link", { name: "See our work" }).click();
    await expect(page).toHaveURL(/#work$/);
    await expect(
      page.getByRole("heading", { level: 2, name: /Furniture Odyssey/ }),
    ).toBeInViewport();
  });
}

test("direct section links keep their heading visible with sticky panels", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#approach");
  await expect(page.locator("main.viewport-stack")).toHaveAttribute(
    "data-sticky-ready",
    "true",
  );
  await expect(
    page.getByRole("heading", {
      name: "Understand the operation first. Build the software second.",
    }),
  ).toBeInViewport();
  await page.evaluate(() => {
    window.location.hash = "contact";
  });
  await expect(
    page.getByRole("heading", {
      name: "Tell us what your team is trying to untangle.",
    }),
  ).toBeInViewport();
});
