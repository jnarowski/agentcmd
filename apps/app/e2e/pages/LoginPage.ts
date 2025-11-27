import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Login Page Object
 *
 * Encapsulates all login page interactions:
 * - Form filling and submission
 * - Validation error checking
 * - Success/failure assertions
 */
export class LoginPage extends BasePage {
  // Test IDs for stable selectors
  private readonly testIds = {
    email: "login-email",
    password: "login-password",
    submit: "login-submit",
  };

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string) {
    await this.getByTestId(this.testIds.email).fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string) {
    await this.getByTestId(this.testIds.password).fill(password);
  }

  /**
   * Click submit button
   */
  async clickSubmit() {
    await this.getByTestId(this.testIds.submit).click();
  }

  /**
   * Complete login flow
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Assert error message is visible (checks alert component specifically)
   */
  async expectError(pattern: RegExp = /Invalid (email|credentials)/i) {
    // Use the alert role to avoid matching both alert and toast
    await expect(this.page.getByRole("alert").filter({ hasText: pattern })).toBeVisible();
  }

  /**
   * Assert still on login page (login failed)
   */
  async expectOnLoginPage() {
    expect(this.page.url()).toContain("/login");
  }

  /**
   * Assert no auth token in localStorage
   * Checks Zustand persist store "auth-storage"
   */
  async expectNoAuthToken() {
    const storage = await this.getLocalStorage("auth-storage");
    if (!storage) {
      return; // No storage = no token
    }
    const parsed = JSON.parse(storage);
    expect(parsed?.state?.token).toBeFalsy();
  }

  /**
   * Assert auth token exists in localStorage
   * Checks Zustand persist store "auth-storage"
   */
  async expectAuthToken() {
    const storage = await this.getLocalStorage("auth-storage");
    expect(storage).toBeTruthy();
    const parsed = JSON.parse(storage as string);
    expect(parsed?.state?.token).toBeTruthy();
  }

  /**
   * Check if email field has validation error (HTML5)
   */
  async isEmailInvalid(): Promise<boolean> {
    const input = this.getByTestId(this.testIds.email);
    return input.evaluate((el: HTMLInputElement) => !el.validity.valid);
  }

  /**
   * Check if password field has validation error (HTML5)
   */
  async isPasswordInvalid(): Promise<boolean> {
    const input = this.getByTestId(this.testIds.password);
    return input.evaluate((el: HTMLInputElement) => !el.validity.valid);
  }

  /**
   * Assert email field is invalid
   */
  async expectEmailInvalid() {
    expect(await this.isEmailInvalid()).toBe(true);
  }

  /**
   * Assert password field is invalid
   */
  async expectPasswordInvalid() {
    expect(await this.isPasswordInvalid()).toBe(true);
  }
}
