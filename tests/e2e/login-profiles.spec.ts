import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3131" });

test.describe("Login: language toggle + demo profiles", () => {
  test("header toggle switches to English; 5 profiles listed", async ({ page }) => {
    await page.goto("/login");

    // 5 sample-neighbor profile buttons, each starting a different story.
    const profiles = page.locator('#profiles button');
    await expect(profiles).toHaveCount(5);

    // Header language toggle flips the page to English and persists via cookie.
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByText("Log in to MediSathi")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try the demo" })).toBeVisible();
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === "medisathi-locale" && c.value === "en")).toBe(true);

    // Toggle back to Bangla.
    await page.getByRole("button", { name: "বাংলা" }).click();
    await expect(page.getByText("মেডিসাথীতে লগ ইন করুন")).toBeVisible();
  });

  test("landing shows profile choices (Bangla default, English with cookie)", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByText("অথবা অন্য কারো রেকর্ড দেখুন:")).toBeVisible();

    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await page.goto("/");
    await expect(page.getByText("Or start as someone else:", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your doctor's paper, in words you can read." })).toBeVisible();
  });
});
