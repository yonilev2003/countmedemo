import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for countme demo.
 *
 * Local run:
 *   npm run test:e2e        # headless
 *   npm run test:e2e:ui     # interactive
 *
 * The webServer block boots `npm run dev` automatically and waits for it
 * to be reachable. CI can set BASE_URL to skip the dev server.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    locale: "he-IL",
    trace: "on-first-retry",
    // Real form is RTL; pin viewport so layout assertions are stable.
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
