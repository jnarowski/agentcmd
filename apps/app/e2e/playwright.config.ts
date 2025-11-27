import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * Key Design:
 * - Sequential execution (workers: 1) for SQLite consistency
 * - Assumes servers running: dev (4100/4101), e2e (5100/5101), inngest (8288)
 * - Test pattern: **\/*.e2e.spec.ts
 * - Dedicated e2e.db database (isolated from dev.db)
 */

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.ts",

  // Sequential execution required for SQLite
  fullyParallel: false,
  workers: 1,

  // Test timeouts
  timeout: 60_000, // 60s per test
  expect: {
    timeout: 10_000, // 10s for assertions
  },

  // Retry on CI, not locally
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: [
    ["html", { outputFolder: "../playwright-report" }],
    ["list"],
  ],

  // Global setup and teardown
  globalSetup: require.resolve("./global-setup"),
  globalTeardown: require.resolve("./global-teardown"),

  use: {
    // Base URL for E2E frontend
    baseURL: "http://localhost:5101",

    // Collect trace on first retry
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",

    // Timeout for individual actions
    actionTimeout: 10_000,
  },

  // Test projects for different browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    // Uncomment for WebKit testing
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  // Output directories
  outputDir: "../test-results",
});
