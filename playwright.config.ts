import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3131",
    trace: "on-first-retry",
  },
  webServer: {
    command: "MONGODB_URI= MODEL_API_KEY= AUTH_SECRET=e2e-demo-secret-not-real-123456789 pnpm dev --port 3131",
    env: { MONGODB_URI: "", MODEL_API_KEY: "", AUTH_SECRET: "e2e-demo-secret-not-real-123456789" },
    url: "http://localhost:3131",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
