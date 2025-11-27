import { test, expect } from "../../fixtures";

/**
 * Login E2E Test
 *
 * Verifies successful login flow:
 * 1. Navigate to login page
 * 2. Enter valid credentials
 * 3. Submit form
 * 4. Verify redirect to dashboard/projects
 * 5. Verify auth token in localStorage
 */

test.describe("Authentication - Login", () => {
  test("should login with valid credentials and redirect to dashboard", async ({
    page,
    testUser,
  }) => {
    // Navigate to login page
    await page.goto("http://localhost:5101/login");

    // Fill login form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', "testpass123");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|projects)/);

    // Verify we're on dashboard or projects page
    expect(page.url()).toMatch(/\/(dashboard|projects)/);

    // Verify auth token is set in localStorage
    const token = await page.evaluate(() => localStorage.getItem("auth_token"));
    expect(token).toBeTruthy();
    expect(token).toBe(testUser.token);
  });

  test("should display user info after successful login", async ({ page, testUser }) => {
    // Navigate to login page
    await page.goto("http://localhost:5101/login");

    // Fill login form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', "testpass123");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/(dashboard|projects)/);

    // Verify user email or name is displayed
    const userInfo = page.locator(`text="${testUser.email}"`);
    await expect(userInfo).toBeVisible();
  });
});
