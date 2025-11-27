import { test, expect } from "../../fixtures";

/**
 * Login Failure E2E Test
 *
 * Verifies login error handling:
 * 1. Navigate to login page
 * 2. Enter invalid credentials
 * 3. Submit form
 * 4. Verify error message displayed
 * 5. Verify no redirect occurred
 * 6. Verify no auth token in localStorage
 */

test.describe("Authentication - Login Failure", () => {
  test("should display error message with invalid credentials", async ({ page }) => {
    // Navigate to login page
    await page.goto("http://localhost:5101/login");

    // Fill login form with invalid credentials
    await page.fill('input[name="email"]', "nonexistent@example.com");
    await page.fill('input[name="password"]', "wrongpassword");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for error message to appear
    const errorMessage = page.locator('text=/Invalid (email|credentials)/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify still on login page
    expect(page.url()).toContain("/login");

    // Verify no auth token in localStorage
    const token = await page.evaluate(() => localStorage.getItem("auth_token"));
    expect(token).toBeFalsy();
  });

  test("should display error message with empty email", async ({ page }) => {
    // Navigate to login page
    await page.goto("http://localhost:5101/login");

    // Fill password only
    await page.fill('input[name="password"]', "somepassword");

    // Submit form
    await page.click('button[type="submit"]');

    // Verify validation error or form not submitted
    const emailInput = page.locator('input[name="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);

    // Verify still on login page
    expect(page.url()).toContain("/login");
  });

  test("should display error message with empty password", async ({ page }) => {
    // Navigate to login page
    await page.goto("http://localhost:5101/login");

    // Fill email only
    await page.fill('input[name="email"]', "test@example.com");

    // Submit form
    await page.click('button[type="submit"]');

    // Verify validation error or form not submitted
    const passwordInput = page.locator('input[name="password"]');
    const isInvalid = await passwordInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);

    // Verify still on login page
    expect(page.url()).toContain("/login");
  });

  test("should display error with correct email but wrong password", async ({
    page,
    testUser,
  }) => {
    // Navigate to login page
    await page.goto("http://localhost:5101/login");

    // Fill login form with correct email but wrong password
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', "wrongpassword123");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for error message
    const errorMessage = page.locator('text=/Invalid (password|credentials)/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify still on login page
    expect(page.url()).toContain("/login");

    // Verify no auth token in localStorage
    const token = await page.evaluate(() => localStorage.getItem("auth_token"));
    expect(token).toBeFalsy();
  });
});
