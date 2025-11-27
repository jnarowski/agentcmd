import { test, expect } from "../../fixtures";
import { LoginPage } from "../../pages";

/**
 * Login Failure E2E Tests
 *
 * Gold standard test demonstrating:
 * - Page Object Model (POM) pattern
 * - data-testid selectors via POM
 * - Form validation assertions
 * - localStorage checks for auth state
 */

test.describe("Authentication - Login Failure", () => {
  test("should display error with invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login("nonexistent@example.com", "wrongpassword");

    // Wait for error message
    await loginPage.expectError();

    // Verify no redirect and no auth token
    await loginPage.expectOnLoginPage();
    await loginPage.expectNoAuthToken();
  });

  test("should validate empty email field", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillPassword("somepassword");
    await loginPage.clickSubmit();

    // Browser's native validation should prevent submission
    await loginPage.expectEmailInvalid();
    await loginPage.expectOnLoginPage();
  });

  test("should validate empty password field", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillEmail("test@example.com");
    await loginPage.clickSubmit();

    // Browser's native validation should prevent submission
    await loginPage.expectPasswordInvalid();
    await loginPage.expectOnLoginPage();
  });
});
