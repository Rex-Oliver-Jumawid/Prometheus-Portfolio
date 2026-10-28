import { expect, test } from "@playwright/test";

test.describe("Prometheus studio layout", () => {
  test("renders the hero, services, case studies and products", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto("/studio");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your design & dev partner");
    await expect(page.getByRole("heading", { name: /Digital experiences/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Furniture Odyssey" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Piercing Corner" })).toBeVisible();
    await expect(page.locator("#products")).toBeVisible();
    await page.screenshot({ path: "test-results/studio-desktop.png", fullPage: true, animations: "disabled" });
  });

  test("mobile navigation works without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio");
    const menu = page.locator("details").filter({ has: page.locator("summary[aria-label='Toggle navigation']") });
    await expect(menu).toBeVisible();
    await menu.locator("summary").click();
    await expect(menu.getByRole("link", { name: "Our work" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    await page.screenshot({ path: "test-results/studio-mobile.png", fullPage: true, animations: "disabled" });
  });

  test("reduced motion keeps links usable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/studio");
    await expect(page.locator("#contact")).toBeVisible();
    await expect(page.getByRole("link", { name: /Start a project/ }).first()).toHaveAttribute("href", "#contact");
  });
});
