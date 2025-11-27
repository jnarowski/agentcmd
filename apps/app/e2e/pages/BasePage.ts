import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Base Page Object
 *
 * Common functionality shared across all page objects:
 * - Navigation helpers
 * - Wait utilities
 * - Common assertions
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to page URL (override in subclass)
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get current URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Assert URL contains path
   */
  async expectUrlContains(path: string) {
    expect(this.page.url()).toContain(path);
  }

  /**
   * Assert URL matches pattern
   */
  async expectUrlMatches(pattern: RegExp) {
    await this.page.waitForURL(pattern);
  }

  /**
   * Get element by test ID
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get element by role
   */
  getByRole(
    role: Parameters<Page["getByRole"]>[0],
    options?: Parameters<Page["getByRole"]>[1]
  ): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get element by text
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(locator: Locator, timeout?: number) {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Get localStorage value
   */
  async getLocalStorage(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set localStorage value
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ k, v }) => localStorage.setItem(k, v),
      { k: key, v: value }
    );
  }

  /**
   * Remove localStorage value
   */
  async removeLocalStorage(key: string): Promise<void> {
    await this.page.evaluate((k) => localStorage.removeItem(k), key);
  }
}
