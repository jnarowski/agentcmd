import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Auth State (created by global-setup, shared across all tests)
 */
interface AuthState {
  user: {
    id: string;
    email: string;
  };
  token: string;
  credentials: {
    email: string;
    password: string;
  };
}

function getAuthState(): AuthState {
  const authStatePath = join(__dirname, "..", ".auth-state.json");
  const content = readFileSync(authStatePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Authenticated Page Fixture
 *
 * Provides:
 * - authenticatedPage: Page with auth token in localStorage
 * - testUser: User object with id, email, token, credentials
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
    credentials: {
      email: string;
      password: string;
    };
  };
}

export const test = base.extend<AuthenticatedPageFixtures>({
  // testUser fixture: reads auth state created by global-setup
  testUser: async ({}, use) => {
    const authState = getAuthState();

    const testUser = {
      id: authState.user.id,
      email: authState.user.email,
      token: authState.token,
      credentials: authState.credentials,
    };

    await use(testUser);
  },

  // authenticatedPage fixture: page with auth token set
  authenticatedPage: async ({ page, testUser }, use) => {
    // Set auth state BEFORE any navigation using addInitScript
    // Zustand persist uses "auth-storage" key with state object format
    const authState = {
      state: {
        user: { id: testUser.id, email: testUser.email },
        token: testUser.token,
        isAuthenticated: true,
      },
      version: 0,
    };

    await page.addInitScript((state) => {
      localStorage.setItem("auth-storage", JSON.stringify(state));
    }, authState);

    // Now navigate - auth will be recognized immediately
    await page.goto("/");

    // Wait for redirect to dashboard (confirms auth is working)
    await page.waitForURL(/\/(dashboard|projects)/, { timeout: 10000 });

    await use(page);
  },
});

export { expect } from "@playwright/test";
