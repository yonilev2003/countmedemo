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
    // Managed containers pre-install Chromium at a fixed path that may not
    // match the exact build this @playwright/test version pins. Set
    // PLAYWRIGHT_CHROMIUM_PATH (e.g. /opt/pw-browsers/chromium) to use it
    // instead of downloading browsers.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: process.env.BASE_URL
    ? undefined
    : {
        // --webpack, matching the build script: Turbopack dev mode resolves
        // Google Fonts over the network at server startup, and a transient
        // fonts.gstatic.com failure once killed the whole CI e2e job with
        // "Timed out waiting 60000ms from config.webServer" before a single
        // test ran (run 31897415418). Webpack dev mode has no such runtime
        // font-network dependency.
        command: "npm run dev -- --webpack",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 90_000,
      },
});
