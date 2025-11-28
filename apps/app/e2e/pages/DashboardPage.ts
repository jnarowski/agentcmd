import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Dashboard Page Object
 *
 * Main authenticated landing page.
 * Provides interactions for:
 * - User menu (sidebar footer)
 * - Logout flow
 * - Navigation to other sections
 */
export class DashboardPage extends BasePage {
  // Test IDs for stable selectors
  private readonly testIds = {
    userMenuTrigger: "user-menu-trigger",
    logoutButton: "logout-button",
  };

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/projects");
    // Wait for page to fully load with sidebar
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Assert user is authenticated (has token)
   * Checks Zustand persist store "auth-storage"
   */
  async expectAuthenticated() {
    const storage = await this.getLocalStorage("auth-storage");
    if (!storage) {
      throw new Error("Expected auth-storage in localStorage but found none");
    }
    const parsed = JSON.parse(storage);
    if (!parsed?.state?.token) {
      throw new Error("Expected token in auth-storage but found none");
    }
  }

  /**
   * Open the user menu dropdown in the sidebar footer
   */
  async openUserMenu() {
    const userMenuTrigger = this.getByTestId(this.testIds.userMenuTrigger);
    // Wait for sidebar to render
    await expect(userMenuTrigger).toBeVisible({ timeout: 10000 });
    await userMenuTrigger.click();
  }

  /**
   * Click the logout button in the user menu
   * Assumes user menu is already open
   */
  async clickLogout() {
    await this.getByTestId(this.testIds.logoutButton).click();
  }

  /**
   * Complete logout flow via UI
   * Opens user menu and clicks logout
   */
  async logout() {
    await this.openUserMenu();
    await this.clickLogout();
  }

  /**
   * Assert auth token has been cleared (logout successful)
   */
  async expectLoggedOut() {
    const storage = await this.getLocalStorage("auth-storage");
    if (!storage) {
      return; // No storage = logged out
    }
    const parsed = JSON.parse(storage);
    expect(parsed?.state?.token).toBeFalsy();
    expect(parsed?.state?.isAuthenticated).toBeFalsy();
  }

  /**
   * Assert redirected to login page
   */
  async expectRedirectedToLogin() {
    await this.page.waitForURL(/\/login/, { timeout: 10000 });
    expect(this.page.url()).toContain("/login");
  }

  /**
   * Navigate to projects
   */
  async goToProjects() {
    await this.page.goto("/projects");
  }

  /**
   * Navigate to sessions
   */
  async goToSessions() {
    await this.page.goto("/sessions");
  }

  /**
   * Navigate to workflows
   */
  async goToWorkflows() {
    await this.page.goto("/workflows");
  }
}
