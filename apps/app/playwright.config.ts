import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests with Docker
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4100',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /**
   * Run Docker Compose before starting tests
   * Health check ensures app is ready before tests begin
   */
  webServer: {
    command: 'docker-compose up',
    url: 'http://localhost:4100/api/health',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
