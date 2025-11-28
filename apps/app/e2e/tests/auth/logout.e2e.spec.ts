import { test, expect } from "../../fixtures";
import { DashboardPage } from "../../pages";

/**
 * Logout E2E Tests
 *
 * Gold standard patterns demonstrated:
 * - Page Object Model (POM) with test-ids
 * - authenticatedPage fixture for pre-authenticated state
 * - Real UI interactions (not localStorage manipulation)
 * - AAA pattern (Arrange-Act-Assert)
 * - Behavior testing (verify redirect + auth state cleared)
 */

test.describe("Authentication - Logout", () => {
  test("should logout via user menu and redirect to login", async ({ authenticatedPage }) => {
    // Arrange: Navigate to dashboard with authenticated session
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.expectAuthenticated();

    // Act: Logout via UI (open user menu → click logout)
    await dashboardPage.logout();

    // Assert: Auth state cleared and redirected to login
    await dashboardPage.expectLoggedOut();
    await dashboardPage.expectRedirectedToLogin();
  });

  test("should clear auth token on logout", async ({ authenticatedPage }) => {
    // Arrange: Verify we start authenticated
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.expectAuthenticated();

    // Act: Logout
    await dashboardPage.logout();

    // Assert: Token is cleared from localStorage
    const storage = await authenticatedPage.evaluate(() =>
      localStorage.getItem("auth-storage")
    );

    if (storage) {
      const parsed = JSON.parse(storage);
      expect(parsed?.state?.token).toBeFalsy();
      expect(parsed?.state?.user).toBeFalsy();
      expect(parsed?.state?.isAuthenticated).toBe(false);
    }
    // No storage also means logged out
  });

  test("should deny access to protected routes after logout", async ({ authenticatedPage }) => {
    // Arrange: Start authenticated and logout
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.logout();

    // Act: Try to access protected route
    await authenticatedPage.goto("/projects");

    // Assert: Redirected to login
    await expect(authenticatedPage).toHaveURL(/\/login/);
  });
});
