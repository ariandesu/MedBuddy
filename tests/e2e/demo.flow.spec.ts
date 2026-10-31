import { test, expect, type Page } from "@playwright/test";

test.use({ baseURL: "http://localhost:3131" });

async function demoLogin(page: Page) {
  await page.goto("/login");
  await expect(page).toHaveURL("/login");
  await page.click('button:has-text("Try the demo")');
  await expect(page).toHaveURL("/dashboard");
}

test.describe("T27 E2E demo flow (upload → review → confirm)", () => {
  test("full flow in English", async ({ page, context }) => {
    await context.addCookies([
      { name: "medisathi-locale", value: "en", domain: "localhost", path: "/" },
    ]);
    await demoLogin(page);

    // Navigate to Documents via nav link
    await page.click('a:has-text("Documents")');
    await expect(page.locator("h1")).toContainText("Documents");

    // Wait for at least one document card
    await expect(page.locator("article").first()).toBeVisible();

    // Click a needs_review document card's "Review" button
    await page.locator('a:has-text("Review")').first().click();
    await expect(page.locator("h1")).toContainText("Review extracted values");

    // Tick every "I checked this" box
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    // Confirm
    await page.click('button:has-text("Confirm")');
    await expect(page).toHaveURL("/documents");

    // Check-in with chest pain → urgent dialog
    await page.click('a:has-text("Check-in")');
    await page.click('text="Chest pain"');
    await page.click('button:has-text("Save check-in")');
    await expect(page.locator("text=This may need urgent care")).toBeVisible();

    // Timeline
    await page.click('a:has-text("Timeline")');
    await expect(page.locator("h1")).toContainText("Timeline");

    // Summary → Generate
    await page.click('a:has-text("Summary")');
    await page.click('button:has-text("Generate summary")');
    await expect(page.locator("text=Summary generated")).toBeVisible();
    await expect(page.locator("a[href*='timeline#rec-']")).toHaveCount(1);

    // Report → print
    await page.click('a:has-text("Report")');
    await expect(page.locator("h1")).toContainText("Doctor report");
  });

  test("full flow in Bangla", async ({ page, context }) => {
    await context.addCookies([
      { name: "medisathi-locale", value: "bn", domain: "localhost", path: "/" },
    ]);
    await demoLogin(page);

    await page.click('text="কাগজপত্র"');
    await expect(page.locator("h1")).toContainText("কাগজপত্র");

    await page.locator('a:has-text("যাচাই করুন")').first().click();
    await expect(page.locator("h1")).toContainText("তথ্য যাচাই করুন");

    // Tick every checkbox
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await page.click('button:has-text("নিশ্চিত করুন")');
    await expect(page).toHaveURL("/documents");

    // Check-in with chest pain → urgent dialog
    await page.click('text="চেক-ইন"');
    await page.click('text="বুকের ব্যাথা"');
    await page.click('button:has-text("সংরক্ষণ করুন")');
    await expect(page.locator("text=এটি জরুরি চিকিৎসার")).toBeVisible();

    await page.click('text="টাইমলাইন"');
    await expect(page.locator("h1")).toContainText("টাইমলাইন");

    await page.click('text="সারাংশ"');
    await page.click('button:has-text("সারাংশ তৈরি করুন")');
    await expect(page.locator("text=সারাংশ তৈরি করা হয়েছে")).toBeVisible();

    await page.click('text="ডাক্তারের রিপোর্ট"');
    await expect(page.locator("h1")).toContainText("ডাক্তারের রিপোর্ট");
  });
});
