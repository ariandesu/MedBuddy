import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3131" });

test.describe("Login: language toggle + demo profiles", () => {
  test("header toggle switches to English; no profile choices without a database", async ({ page }) => {
    await page.goto("/login");

    // These tests run with no database: everyone shares one sample account, so
    // nothing offers a choice of neighbors that would all open the same data.
    await expect(page.locator('#profiles button')).toHaveCount(0);

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

  test("landing follows the page language, with no hydration errors", async ({ page, context }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/");
    await expect(page.getByRole("button").filter({ hasText: "বাংলায় দেখুন" })).toBeVisible();
    await expect(page.getByText("নমুনা রেকর্ড খুলবে")).toBeVisible();
    await expect(page.getByRole("heading", { name: "অথবা অন্য কারো রেকর্ড দেখুন:" })).toHaveCount(0);

    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Your doctor's paper, in words you can read." })).toBeVisible();
    await expect(page.getByText("Opens sample records")).toBeVisible();
    // The first button is in the page's own language.
    await expect(page.locator("main button").first()).toHaveText("Try it in English");
    expect(errors).toEqual([]);
  });

  test("the site's address stays on the landing page when signed in", async ({ page, context }) => {
    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await page.goto("/login");
    await page.getByRole("button", { name: "Try the demo" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/");
    await expect(page).toHaveURL(/localhost:3131\/$/);
    await expect(page.getByRole("heading", { name: "Your doctor's paper, in words you can read." })).toBeVisible();

    // Exactly what a signed-out visitor sees.
    await expect(page.getByRole("button", { name: "Try it in English", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main menu" })).toHaveCount(0);
    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
