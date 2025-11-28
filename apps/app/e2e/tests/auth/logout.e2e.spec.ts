import { test, expect } from "../../fixtures";
import { DashboardPage } from "../../pages";

/**
 * Logout E2E Tests
 *
 * Gold standard test demonstrating:
 * - Page Object Model (POM) pattern
 * - authenticatedPage fixture for pre-authenticated state
 * - localStorage assertions via POM
 * - Protected route redirect behavior
 */

test.describe("Authentication - Logout", () => {
  test("should redirect to login when clicking logout button", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Navigate to dashboard (authenticatedPage has token set)
    await dashboardPage.goto();

    // Verify authenticated state
    await dashboardPage.expectAuthenticated();

    // Click the user menu button (contains user email)
    await authenticatedPage.getByRole('button', { name: /@/ }).click();

    // Click the logout menu item
    await authenticatedPage.getByRole('menuitem', { name: /log out/i }).click();

    // Should redirect to login after logout
    await authenticatedPage.waitForURL(/\/login/, { timeout: 5000 });
    expect(authenticatedPage.url()).toContain("/login");
  });
});
