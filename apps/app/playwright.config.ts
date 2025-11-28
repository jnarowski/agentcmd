import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Absolute path to e2e.db - ensures all processes use same database
const E2E_DATABASE_PATH = join(__dirname, "prisma", "e2e.db");
const E2E_DATABASE_URL = `file:${E2E_DATABASE_PATH}`;

/**
 * Playwright E2E Test Configuration
 *
 * Best Practices Applied:
 * - Single browser (Chromium) for speed and consistency
 * - Auto-start servers with webServer config
 * - baseURL for cleaner test code
 * - Shorter timeouts for faster failure detection
 * - Dedicated e2e.db database (isolated from dev.db)
 *
 * @see https://playwright.dev/docs/test-configuration
 */

export default defineConfig({
  testDir: "./e2e/tests",
  testMatch: "**/*.e2e.spec.ts",

  // Sequential execution required for SQLite
  fullyParallel: false,
  workers: 1,

  // Shorter timeouts for faster failure detection
  timeout: 30_000, // 30s per test
  expect: {
    timeout: 5_000, // 5s for assertions
  },

  // Retry on CI, not locally
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: [
    ["html", { outputFolder: "./playwright-report" }],
    ["list"],
  ],

  // Global setup and teardown
  globalSetup: join(__dirname, "e2e/global-setup.ts"),
  globalTeardown: join(__dirname, "e2e/global-teardown.ts"),

  use: {
    // Base URL - tests use relative paths: page.goto("/login") instead of "http://localhost:5101/login"
    baseURL: "http://localhost:5101",

    // Collect trace on first retry for debugging
    trace: "on-first-retry",

    // Screenshot and video on failure for debugging
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Shorter action timeout
    actionTimeout: 5_000,
  },

  // Single browser project (Chromium) for speed
  // Add firefox/webkit projects when cross-browser testing is needed
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Auto-start E2E servers (no manual pnpm e2e:server needed)
  // IMPORTANT: reuseExistingServer=false to ensure we don't reuse dev servers
  webServer: [
    {
      command: "tsx --env-file=.env.e2e src/server/index.ts",
      url: "http://localhost:5100/api/health",
      reuseExistingServer: false, // Always start fresh E2E server
      timeout: 30_000,
      env: {
        ...process.env,
        PORT: "5100",
        NODE_ENV: "test",
        DATABASE_URL: E2E_DATABASE_URL,
        JWT_SECRET: "e2e-test-secret-key-12345",
      },
    },
    {
      command: "vite --port 5101",
      url: "http://localhost:5101",
      reuseExistingServer: false, // Always start fresh E2E client
      timeout: 30_000,
      env: {
        ...process.env,
        // PORT tells Vite proxy where to forward /api requests
        PORT: "5100",
        VITE_PORT: "5101",
      },
    },
  ],

  // Output directories
  outputDir: "./test-results",
});
