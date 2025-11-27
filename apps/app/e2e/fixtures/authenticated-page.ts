import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Authenticated Page Fixture
 *
 * Provides:
 * - authenticatedPage: Page with auth token in localStorage
 * - testUser: User object with id, email, token
 *
 * Usage:
 * test('my test', async ({ authenticatedPage, testUser }) => {
 *   await authenticatedPage.goto('/projects');
 *   // Already authenticated!
 * });
 */

export interface AuthenticatedPageFixtures {
  authenticatedPage: Page;
  testUser: {
    id: string;
    email: string;
    token: string;
  };
}

export const test = base.extend<AuthenticatedPageFixtures>({
  // testUser fixture: registers user via API
  testUser: async ({ page }, use) => {
    const email = `test-${Date.now()}@example.com`;
    const password = "testpass123";

    // Register user via API
    const authResponse = await page.request.post(
      "http://localhost:5100/api/auth/register",
      {
        data: { email, password },
      }
    );

    if (!authResponse.ok()) {
      throw new Error(
        `Failed to register user: ${authResponse.status()} ${await authResponse.text()}`
      );
    }

    const authData = await authResponse.json();

    const testUser = {
      id: authData.user.id,
      email: authData.user.email,
      token: authData.token,
    };

    await use(testUser);

    // Cleanup: delete user after test
    // Note: Requires authenticated API call to delete user
    // For now, global-teardown cleans the database
  },

  // authenticatedPage fixture: page with auth token set
  authenticatedPage: async ({ page, testUser }, use) => {
    // Navigate to app and set auth token in localStorage
    await page.goto("http://localhost:5101");
    await page.evaluate((token) => {
      localStorage.setItem("auth_token", token);
    }, testUser.token);

    await use(page);
  },
});

export { expect } from "@playwright/test";
