import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Dashboard Page Object
 *
 * Main authenticated landing page.
 * Extend with dashboard-specific interactions as needed.
 */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/dashboard");
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
   * Logout by clearing auth storage
   * Clears Zustand persist store "auth-storage"
   */
  async logout() {
    await this.removeLocalStorage("auth-storage");
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
