import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Projects Page Object
 *
 * Project listing and management page.
 * Extend with project-specific interactions as needed.
 */
export class ProjectsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/projects");
  }

  /**
   * Get project cards/rows
   */
  getProjectList(): Locator {
    return this.page.locator('[data-testid="project-list"], [data-testid="project-card"]');
  }

  /**
   * Get specific project by name
   */
  getProjectByName(name: string): Locator {
    return this.page.locator(`text="${name}"`);
  }

  /**
   * Click create project button
   */
  async clickCreateProject() {
    await this.page.locator('button:has-text("Create"), button:has-text("New Project"), [data-testid="create-project"]').first().click();
  }

  /**
   * Assert project exists in list
   */
  async expectProjectVisible(name: string) {
    await expect(this.getProjectByName(name)).toBeVisible();
  }

  /**
   * Assert project count
   */
  async expectProjectCount(count: number) {
    const list = this.getProjectList();
    await expect(list).toHaveCount(count);
  }

  /**
   * Navigate to project details
   */
  async openProject(name: string) {
    await this.getProjectByName(name).click();
  }

  /**
   * Assert redirected to login (unauthenticated)
   */
  async expectRedirectedToLogin() {
    await this.page.waitForURL(/\/login/);
    expect(this.page.url()).toContain("/login");
  }
}
