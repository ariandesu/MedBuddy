import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3131" });

test.describe("M9 demo flow (demo mode, no credentials)", () => {
  test("demo login -> documents -> review/confirm -> check-in -> timeline -> summary -> ask -> report", async ({
    page,
    context,
  }) => {
    // Use English UI for stable selectors
    await context.addCookies([
      { name: "medisathi-locale", value: "en", domain: "localhost", path: "/" },
    ]);

    // 1. Login (demo) via the real UI form
    await page.goto("/login");
    await expect(page).toHaveURL("/login");
    await page.fill('input[name="email"]', "demo@medisathi.app");
    await page.fill('input[name="password"]', "demo1234");
    await page.click('button:has-text("Log in")');
    await expect(page).toHaveURL("/dashboard");

    // 2. Documents -> seeded list (4 docs, 2 confirmed + 2 needs_review)
    await page.goto("/documents");
    await expect(page.locator("h1")).toContainText("Documents");
    await expect(page.locator("text=Lipid-Profile.jpg")).toBeVisible();
    await expect(page.locator("text=Prescription-handwritten.jpg")).toBeVisible();

    // 3. Review a needs_review document -> confirm
    await page.goto("/documents/doc_lipid_002");
    await expect(page.locator("h1")).toContainText("Review extracted values");
    await page.click('button:has-text("Confirm")');
    await expect(page).toHaveURL("/documents");

    // 4. Check-in
    await page.goto("/checkin");
    await page.click('button:has-text("Save check-in")');
    await expect(page.locator("text=Save successful")).toBeVisible();

    // 5. Timeline
    await page.goto("/timeline");
    await expect(page.locator("h1")).toContainText("Timeline");

    // 6. Summary -> generate
    await page.goto("/summary");
    await page.click('button:has-text("Generate summary")');
    await expect(page.locator("text=Summary generated")).toBeVisible();

    // 7. Ask
    await page.goto("/ask");
    await page.fill('input[placeholder*="Ask a question"]', "What medicines?");
    await page.click('button:has-text("Send")');
    await expect(page.locator("text=Answer")).toBeVisible();

    // 8. Report
    await page.goto("/report");
    await expect(page.locator("h1")).toContainText("Doctor report");
  });
});
