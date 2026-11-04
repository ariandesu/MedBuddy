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
    await expect(save).toHaveCount(0);

    // Jump to one value from the list, and edit it.
    await page.getByRole("button", { name: "সব মান দেখুন" }).click();
    await page.getByRole("button", { name: /ওষুধ ১ — নাম/ }).click();
    await page.locator("#value-input").fill("Fexo 120");

    // Then check every value, one at a time.
    const step = page.getByRole("button", { name: /^(ঠিক আছে|পরবর্তী)/ });
    while ((await step.count()) > 0) await step.first().click();
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page).toHaveURL(/\/records/);

    // The confirmed, edited value shows on the timeline.
    await page.goto("/records?tab=timeline");
    await expect(page.getByText("Fexo 120")).toBeVisible();

    // Its source link opens the saved paper, which says what it says and offers an explanation.
    await page.getByRole("link", { name: "সহজ ভাষায় ব্যাখ্যা" }).first().click();
    await expect(page).toHaveURL(/\/documents\//);
    await expect(page.getByRole("heading", { name: "কাগজে যা লেখা আছে" })).toBeVisible();
    await expect(page.getByRole("button", { name: "রেকর্ড সংরক্ষণ করুন" })).toHaveCount(0);
    await page.goto("/records?tab=timeline");

    // Today is already done in the demo, so check-in opens on the saved screen.
    await page.getByRole("link", { name: "চেক-ইন" }).first().click();
    await expect(page).toHaveURL(/\/checkin\/saved/);
    await page.getByRole("link", { name: "আজকের চেক-ইন বদলান" }).click();

    // Step 1: one tap on an urgent sign → alert with a call button, Bangla first.
    const chip = page.getByRole("button", { name: "বুকে ব্যথা" });
    await chip.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("৯৯৯");
    await expect(dialog).toContainText("This may need");
    await expect(page.getByRole("link", { name: /৯৯৯/ })).toHaveAttribute("href", "tel:999");
    // Before saving, "I understand" stays on the form with the choice kept.
    await page.getByRole("button", { name: "আমি বুঝছি" }).click();
    await expect(page).toHaveURL(/\/checkin/);
    await expect(chip).toHaveAttribute("aria-pressed", "true");

    // A reload never lands past the urgent signs, and clears what wasn't saved.
    await page.getByRole("button", { name: "পরবর্তী" }).click();
    await expect(page).toHaveURL(/step=2/);
    await page.reload();
    await expect(page.getByText("৪টির মধ্যে ১ নম্বর ধাপ")).toBeVisible();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await chip.click();
    await page.getByRole("button", { name: "আমি বুঝছি" }).click();

    // Walk the remaining steps. Save warns again, "I understand" moves on, and the warning stays.
    const forward = page.getByRole("button", { name: /^(পরবর্তী|এড়িয়ে যান)$/ });
    await forward.click();
    await expect(page).toHaveURL(/step=2/);
    await forward.click();
    await expect(page).toHaveURL(/step=3/);
    await forward.click();
    await expect(page).toHaveURL(/step=4/);
    await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await expect(dialog).toContainText("৯৯৯");
    await page.getByRole("button", { name: "আমি বুঝছি" }).click();
    await expect(page).toHaveURL(/\/checkin\/saved/);
    await expect(page.getByRole("alert").filter({ hasText: "৯৯৯" })).toBeVisible();
  });

  test("every urgent sign and Severe open the dialog at once", async ({ page, context }) => {
    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await demoLogin(page, /demo/i);
    await page.goto("/checkin?edit=1");

    const dialog = page.getByRole("alertdialog");
    const understand = page.getByRole("button", { name: "I understand" });
    for (const name of ["Chest pain", "Trouble breathing", "Fainting", "Heavy bleeding", "Confusion", /^Stroke signs/]) {
      const sign = page.getByRole("button", { name });
      if ((await sign.getAttribute("aria-pressed")) === "true") await sign.click();
      await sign.click();
      await expect(dialog).toContainText("call 999");
      await expect(page.getByRole("link", { name: /Call 999/ })).toHaveAttribute("href", "tel:999");
      await understand.click();
      await expect(dialog).toHaveCount(0);
      await expect(sign).toHaveAttribute("aria-pressed", "true");
    }

    await page.getByRole("button", { name: "Next", exact: true }).click();
    const severe = page.getByRole("button", { name: /^Severe/ });
    if ((await severe.getAttribute("aria-pressed")) === "true") await severe.click();
    await severe.click();
    await expect(dialog).toContainText("call 999");
    await understand.click();
    // Other choices never warn.
    await page.getByRole("button", { name: /^Mild/ }).click();
    await page.getByRole("button", { name: "Headache" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("a check-in with nothing urgent saves and shows what was saved", async ({ page, context }) => {
    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await demoLogin(page, /demo/i);
    await page.goto("/checkin?edit=1");

    // Clear anything urgent left from another test: this is the shared demo account.
    for (const name of ["Chest pain", "Trouble breathing", "Fainting", "Heavy bleeding", "Confusion", /^Stroke signs/]) {
      const sign = page.getByRole("button", { name });
      if ((await sign.getAttribute("aria-pressed")) === "true") await sign.click();
    }
    await page.getByRole("button", { name: "None of these" }).click();
    const severe = page.getByRole("button", { name: /^Severe/ });
    if ((await severe.getAttribute("aria-pressed")) === "true") await severe.click();
    await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
    await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
    await page.getByRole("button", { name: "Energy 2" }).click();
    await page.getByRole("button", { name: "Save check-in" }).click();
    await expect(page).toHaveURL(/\/checkin\/saved/);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "999" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main menu" }).last()).toBeVisible();
  });

  test("Ask's sources open the saved paper", async ({ page, context }) => {
    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await demoLogin(page, /demo/i);

    // The sample AI cites nothing, so stand in for the model with a real record's id.
    const { records } = await (await page.request.get("/api/medical-records")).json();
    const record = records[0];
    await page.route("**/api/ask", (route) =>
      route.fulfill({
        json: { answer: "Sample answer.", citations: [{ id: record.id, label: "ignored" }], limitations: [] },
      })
    );

    await page.goto("/ask");
    await page.getByRole("button", { name: "Is my hemoglobin normal?" }).click();
    const source = page.getByRole("region", { name: "From these records" }).getByRole("link");
    await expect(source).toHaveCount(1);
    await expect(source).not.toContainText("ignored");
    await source.click();
    await expect(page).toHaveURL(new RegExp(`/documents/${record.documentId}`));
    await expect(page.getByRole("heading", { name: "What the paper says" })).toBeVisible();
  });

  test("the printed report lists values as written, with sources and no email", async ({ page, context }) => {
    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await demoLogin(page, /demo/i);
    await page.goto("/show-doctor");
    const printed = page.getByTestId("printed-report");
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeEnabled();
    await expect(printed).toBeHidden();

    await page.emulateMedia({ media: "print" });
    await expect(printed).toBeVisible();
    await expect(printed).toContainText("Hemoglobin");
    await expect(printed).toContainText("13.0-17.0");
    await expect(printed).toContainText("CBC-Report.jpg");
    await expect(printed).not.toContainText("@medisathi.app");
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
  });

  test("a failed load says so instead of showing an empty list", async ({ page, context }) => {
    await context.addCookies([{ name: "medisathi-locale", value: "en", domain: "localhost", path: "/" }]);
    await demoLogin(page, /demo/i);
    await page.route("**/api/documents", (route) => route.fulfill({ status: 500, body: "{}" }));
    await page.goto("/records");
    await expect(page.getByRole("alert").filter({ hasText: "couldn't load" })).toBeVisible();
    await expect(page.getByText("No documents yet.")).toHaveCount(0);
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
