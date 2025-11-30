import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Project Detail Page Object
 *
 * Project home page with tabs (Sessions, Workflows, Git, Settings)
 */
export class ProjectDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
  }

  /**
   * Click tab by name
   */
  async clickTab(tabName: "Sessions" | "Workflows" | "Git" | "Settings") {
    await this.page.locator(`button:has-text("${tabName}"), a:has-text("${tabName}")`).first().click();
  }

  /**
   * Click Edit button (in Settings or header)
   */
  async clickEditButton() {
    await this.page.locator('button:has-text("Edit"), [data-testid="project-edit-button"]').first().click();
  }

  /**
   * Click breadcrumb link
   */
  async clickBreadcrumb(text: string) {
    await this.getByTestId("breadcrumb").filter({ hasText: text }).first().click();
  }

  /**
   * Get project name from header
   */
  async getProjectName(): Promise<string> {
    const locator = this.page.locator("h1, h2").first();
    return await locator.textContent() || "";
  }

  /**
   * Assert on project page
   */
  async expectOnProjectPage(projectId?: string) {
    if (projectId) {
      await this.expectUrlContains(`/projects/${projectId}`);
    } else {
      await this.expectUrlContains(`/projects/`);
    }
  }

  /**
   * Assert project name visible
   */
  async expectProjectNameVisible(name: string) {
    await expect(this.page.locator(`text="${name}"`).first()).toBeVisible();
  }
}
