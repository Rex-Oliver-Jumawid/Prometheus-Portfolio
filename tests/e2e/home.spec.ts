import { expect, test } from "@playwright/test";

test("the banner smoothly expands its white hover fill from the center without resizing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const ribbon = page.getByRole("link", {
    name: "Prometheus home",
    exact: true,
  });
  const original = await ribbon.boundingBox();
  const fill = () =>
    ribbon.evaluate((element) => {
      const style = getComputedStyle(element, "::before");
      return {
        scaleX: new DOMMatrix(style.transform).a,
        scale: new DOMMatrix(style.transform).d,
        duration: style.transitionDuration,
        background: style.backgroundColor,
      };
    });
  expect((await fill()).scale).toBe(0);
  expect((await fill()).scaleX).toBe(0);
  expect((await fill()).duration).toBe("0.5s");
  await ribbon.hover();
  await expect.poll(async () => (await fill()).scale).toBe(1);
  expect((await fill()).scaleX).toBe(1);
  expect((await fill()).background).toBe("rgb(255, 255, 255)");
  expect(await ribbon.boundingBox()).toEqual(original);
  await page.getByRole("button", { name: "Open navigation" }).hover();
  await expect.poll(async () => (await fill()).scale).toBe(0);
  await page.keyboard.press("Tab");
  await expect(ribbon).toBeFocused();
  await expect.poll(async () => (await fill()).scale).toBe(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await fill()).duration).toBe("0s");
});

test("shows the public portfolio homepage", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Where Ideas Ignite/,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Prometheus" });
  await expect(
    dialog.getByRole("link", { name: "Work", exact: true }),
  ).toHaveAttribute("href", "#work");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();

  await expect(
    page.getByRole("heading", { level: 2, name: /Furniture Odyssey/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open navigation" }).click();
  await dialog.getByRole("link", { name: "Approach", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#approach$/);
  await expect(
    page.getByRole("heading", {
      name: "Understand the operation first. Build the software second.",
    }),
  ).toBeInViewport();
});

for (const [width, height] of [
  [320, 568],
  [390, 667],
  [768, 768],
  [1366, 768],
  [1440, 900],
  [844, 390],
]) {
  test(`fits the hero and its controls in one ${width}×${height} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const hero = page.locator("#top");
    const bounds = await hero.boundingBox();
    expect(bounds!.height).toBe(height);
    const figure = await hero.locator('img[height="718"]').boundingBox();
    const workBounds = await page.locator("#work").boundingBox();
    expect(figure!.y + figure!.height).toBeGreaterThan(workBounds!.y);
    await expect(hero).toHaveCSS("overflow-y", "visible");
    const stack = hero.getByRole("complementary", { name: "From Prometheus" });
    await expect(stack).toBeInViewport({ ratio: 1 });
    await expect(stack.getByRole("button")).toHaveCount(0);
    const copyBounds = await page
      .getByRole("link", { name: "See our work" })
      .boundingBox();
    const cardBounds = await hero.getByRole("article").boundingBox();
    expect(cardBounds!.y).toBeGreaterThanOrEqual(0);
    expect(cardBounds!.y + cardBounds!.height).toBeLessThanOrEqual(height);
    if (height > 500)
      expect(copyBounds!.y + copyBounds!.height).toBeLessThanOrEqual(
        cardBounds!.y,
      );

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeInViewport();
    const copyPosition = await heading.evaluate((element) => {
      const copy = element.parentElement!;
      const content = copy.parentElement!;
      const bounds = copy.getBoundingClientRect();
      const contentBounds = content.getBoundingClientRect();
      const style = getComputedStyle(content);
      const firstRowHeight = Number.parseFloat(style.gridTemplateRows);
      return {
        center: bounds.top + bounds.height / 2,
        rowCenter:
          contentBounds.top +
          Number.parseFloat(style.paddingTop) +
          firstRowHeight / 2,
      };
    });
    expect(copyPosition.center).toBeCloseTo(copyPosition.rowCenter, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const headline = await heading.locator("span").first().boundingBox();
    expect(headline).not.toBeNull();
    expect(headline!.x + headline!.width).toBeLessThanOrEqual(width);

    await expect(
      page.getByRole("heading", {
        name: "We want to bring ideas to life.",
      }),
    ).toBeVisible();
    await expect(hero.getByRole("article")).toHaveCSS(
      "transition-duration",
      "0s",
    );

    const ribbon = page.locator('a[aria-label="Prometheus home"]');
    const originalRibbon = await ribbon.elementHandle();
    const ribbonBounds = await ribbon.boundingBox();
    expect(ribbonBounds!.height).toBeLessThanOrEqual(88);
    const straightCards = await hero.locator("article").evaluateAll((cards) =>
      cards.every((card) => {
        const transform = new DOMMatrix(getComputedStyle(card).transform);
        return transform.b === 0 && transform.c === 0;
      }),
    );
    expect(straightCards).toBe(true);
    await page.getByRole("button", { name: "Open navigation" }).click();
    const dialog = page.getByRole("dialog", { name: "Prometheus" });
    await expect(dialog).toHaveCSS("transform", "none");
    await expect(dialog).toHaveCSS("background-color", "rgb(40, 35, 33)");
    await expect(dialog).toHaveCSS("border-right-width", "0px");
    await expect(dialog).toHaveCSS("scrollbar-width", "none");
    const menuRibbon = ribbon;
    await expect(ribbon).toHaveCount(1);
    expect(
      await originalRibbon!.evaluate((element) => element.isConnected),
    ).toBe(true);
    await expect(
      dialog.getByRole("link", { name: "Prometheus home" }),
    ).toHaveCount(0);
    await expect(menuRibbon).toBeInViewport({ ratio: 1 });
    expect(
      await menuRibbon.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          document
            .elementFromPoint(bounds.left + bounds.width / 2, bounds.top + 30)
            ?.closest('a[aria-label="Prometheus home"]') === element
        );
      }),
    ).toBe(true);
    await expect(menuRibbon).toHaveCSS(
      "background-color",
      "rgb(244, 235, 222)",
    );
    expect((await menuRibbon.boundingBox())!.x).toBeCloseTo(ribbonBounds!.x, 0);
    const close = dialog.getByRole("button", { name: "Close navigation" });
    const closeBounds = await close.boundingBox();
    const iconBounds = await close.locator("span").boundingBox();
    expect(iconBounds!.x + iconBounds!.width / 2).toBeCloseTo(
      closeBounds!.x + closeBounds!.width / 2,
      0,
    );
    expect(iconBounds!.y + iconBounds!.height / 2).toBeCloseTo(
      closeBounds!.y + closeBounds!.height / 2,
      0,
    );
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("link", { name: "Start a conversation" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();

    await page.getByRole("link", { name: "See our work" }).click();
    await expect(page).toHaveURL(/#work$/);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Furniture Odyssey/,
      }),
    ).toBeInViewport();
  });
}
