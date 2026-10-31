import { test, expect, type Page } from "@playwright/test";

test.use({ baseURL: "http://localhost:3131" });

async function demoLogin(page: Page, buttonText: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name: buttonText }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("Demo flow: review → confirm → check-in → doctor page", () => {
  test("Bangla, on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await demoLogin(page, /ডেমো/);

    // Home's next-step card goes straight to the first document to check.
    await page.getByRole("link", { name: "যাচাই শুরু করুন" }).click();
    await expect(page.locator("h1")).toContainText("তথ্য যাচাই করুন");
    const save = page.getByRole("button", { name: "রেকর্ড সংরক্ষণ করুন" });
    await expect(save).toBeDisabled();

    // Edit one value, then mark every value checked.
    await page.locator("main input").first().fill("Fexo 120");
    const ok = page.getByRole("button", { name: "ঠিক আছে" });
    while ((await ok.count()) > 0) await ok.first().click();
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page).toHaveURL(/\/records/);

    // The confirmed, edited value shows on the timeline.
    await page.goto("/records?tab=timeline");
    await expect(page.getByText("Fexo 120")).toBeVisible();

    // Check-in: one tap on an urgent sign → Bangla alert with a call button.
    await page.getByRole("link", { name: "চেক-ইন" }).first().click();
    const chip = page.getByRole("button", { name: "বুকে ব্যথা" });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("৯৯৯");
    await expect(dialog).not.toContainText("This may need");
    await expect(page.getByRole("link", { name: /৯৯৯/ })).toHaveAttribute("href", "tel:999");
    await page.getByRole("button", { name: "আমি বুঝছি" }).click();

    // Doctor page → summary tab → generate.
    await page.goto("/show-doctor?tab=summary");
    await page.getByRole("button", { name: "সারাংশ তৈরি করুন" }).click();
    await expect(page.getByText("সারাংশ তৈরি করা হয়েছে")).toBeVisible();

    // Nothing on the page is wider than the phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("English, on desktop", async ({ page, context }) => {
    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await demoLogin(page, /demo/i);

    const nav = page.getByRole("navigation", { name: "Main menu" }).first();
    await expect(nav.getByRole("link")).toHaveCount(5);

    await nav.getByRole("link", { name: "Records" }).click();
    await expect(page.locator("h1")).toContainText("Records");
    await page.getByRole("link", { name: "Timeline" }).click();
    await expect(page.getByText("Latest lab results")).toBeVisible();

    // Old URLs still work.
    await page.goto("/report");
    await expect(page).toHaveURL(/\/show-doctor/);
  });
});
