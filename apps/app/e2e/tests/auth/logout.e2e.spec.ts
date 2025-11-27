import { test, expect } from "../../fixtures";
import { DashboardPage, ProjectsPage } from "../../pages";

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
  test("should redirect to login when token is cleared", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    const projectsPage = new ProjectsPage(authenticatedPage);

    // Navigate to dashboard (authenticatedPage has token set)
    await dashboardPage.goto();

    // Verify authenticated state
    await dashboardPage.expectAuthenticated();

    // Clear token (simulates logout)
    await dashboardPage.logout();

    // Navigate to protected route
    await projectsPage.goto();

    // Should redirect to login
    await projectsPage.expectRedirectedToLogin();
  });
});
