import { test, expect } from "../../fixtures";

/**
 * Logout E2E Test
 *
 * Verifies logout flow:
 * 1. Start with authenticated user
 * 2. Click logout button
 * 3. Verify redirect to login page
 * 4. Verify auth token removed from localStorage
 * 5. Verify cannot access protected routes
 */

test.describe("Authentication - Logout", () => {
  test("should logout and redirect to login page", async ({ authenticatedPage }) => {
    // Navigate to dashboard (authenticated)
    await authenticatedPage.goto("http://localhost:5101/dashboard");

    // Verify auth token exists before logout
    let token = await authenticatedPage.evaluate(() => localStorage.getItem("auth_token"));
    expect(token).toBeTruthy();

    // Click logout button (look for various possible selectors)
    const logoutButton = authenticatedPage.locator(
      'button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Log out"), a:has-text("Sign out")'
    );
    await logoutButton.first().click();

    // Wait for redirect to login page
    await authenticatedPage.waitForURL(/\/login/);

    // Verify we're on login page
    expect(authenticatedPage.url()).toContain("/login");

    // Verify auth token removed from localStorage
    token = await authenticatedPage.evaluate(() => localStorage.getItem("auth_token"));
    expect(token).toBeFalsy();
  });

  test("should not access protected routes after logout", async ({ authenticatedPage }) => {
    // Navigate to dashboard
    await authenticatedPage.goto("http://localhost:5101/dashboard");

    // Logout
    const logoutButton = authenticatedPage.locator(
      'button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Log out"), a:has-text("Sign out")'
    );
    await logoutButton.first().click();

    // Wait for redirect
    await authenticatedPage.waitForURL(/\/login/);

    // Try to navigate to protected route
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Should redirect back to login
    await authenticatedPage.waitForURL(/\/login/, { timeout: 5000 });
    expect(authenticatedPage.url()).toContain("/login");
  });

  test("should clear auth token programmatically", async ({ authenticatedPage }) => {
    // Navigate to dashboard
    await authenticatedPage.goto("http://localhost:5101/dashboard");

    // Verify authenticated
    let token = await authenticatedPage.evaluate(() => localStorage.getItem("auth_token"));
    expect(token).toBeTruthy();

    // Clear token programmatically (simulating logout)
    await authenticatedPage.evaluate(() => {
      localStorage.removeItem("auth_token");
    });

    // Try to navigate to protected route
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Should redirect to login (if auth middleware is working)
    await authenticatedPage.waitForURL(/\/login/, { timeout: 5000 });
    expect(authenticatedPage.url()).toContain("/login");
  });
});
