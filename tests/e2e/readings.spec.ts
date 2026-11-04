import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3131" });

test("a reading typed in shows on Home and the doctor page, and can be removed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const add = page.getByRole("button", { name: "Add a reading" });
  await add.click();

  // An impossible number is refused, with nothing saved.
  await page.getByLabel("Oxygen (%)").fill("140");
  await page.getByRole("button", { name: "Save readings" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Check this number" })).toBeVisible();

  // Bangla digits work as well as English ones.
  await page.getByLabel("Oxygen (%)").fill("৯৭");
  await page.getByLabel("Upper number").fill("128");
  await page.getByLabel("Lower number").fill("84");
  await page.getByRole("button", { name: "Save readings" }).click();

  const card = page.locator("section[aria-labelledby=readings-h]");
  await expect(card.getByText("128/84")).toBeVisible();
  await expect(card.getByText("97", { exact: false })).toBeVisible();
  await expect(card).toContainText("Not measured by MediSathi");
  await expect(card).not.toContainText(/normal|high|low/i);

  await page.goto("/show-doctor");
  await expect(page.locator("section[aria-labelledby=readings-report-h]").getByText("128/84")).toBeVisible();

  await page.goto("/dashboard");
  await add.click();
  await page.getByRole("button", { name: "Remove Blood pressure" }).click();
  await page.getByRole("button", { name: "Yes, remove" }).click();
  await expect(card.getByText("128/84")).toHaveCount(0);
});
