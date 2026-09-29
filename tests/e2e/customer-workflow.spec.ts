import { expect, test, type Page } from "@playwright/test";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@example.test");
  await page.getByLabel("Password").fill("Starter123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("admin completes customer and file workflows", async ({ page }) => {
  const customerName = `Playwright Customer ${Date.now()}`;
  const updatedName = `${customerName} Updated`;
  const attachmentName = `pilot-attachment-${Date.now()}.txt`;

  await signInAsAdmin(page);
  await expect(
    page.getByRole("heading", { name: /Good day, Alex/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Customers" }).first().click();
  await page.getByRole("button", { name: "Add customer" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Name").fill(customerName);
  await createDialog.getByLabel("Email").fill("playwright@example.test");
  await createDialog.getByLabel("Phone").fill("+1 555 010 9090");
  await createDialog.getByLabel("Status").selectOption("active");
  await createDialog.getByRole("button", { name: "Create customer" }).click();

  await expect(page.getByText(customerName, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Edit ${customerName}` }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Name").fill(updatedName);
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Delete ${updatedName}` }).click();
  const deleteDialog = page.getByRole("alertdialog");
  await deleteDialog.getByRole("button", { name: "Delete customer" }).click();
  await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Profile settings" }).first().click();
  const attachments = page.getByRole("region", { name: "Attachments" });
  await attachments
    .getByLabel("Attachment", { exact: true })
    .setInputFiles({ name: attachmentName, mimeType: "text/plain", buffer: Buffer.from("Synthetic pilot attachment.") });
  await attachments.getByRole("button", { name: "Upload" }).click();
  await expect(
    page.getByRole("link", { name: attachmentName }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: `Delete ${attachmentName}` })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete file" })
    .click();
  await expect(
    page.getByRole("link", { name: attachmentName }),
  ).toHaveCount(0);
});
