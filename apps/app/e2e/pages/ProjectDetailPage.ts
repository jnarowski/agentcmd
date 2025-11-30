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
   * Wait for project name to appear in header
   */
  async waitForProjectName(name: string) {
    await expect(this.page.locator(`h1:has-text("${name}")`)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert on project home page (not settings/edit)
   * Waits for both URL and content to load
   */
  async expectOnProjectPage(projectId?: string) {
    // Wait for URL to NOT contain /settings (indicating we're on project home, not edit page)
    await this.page.waitForURL((url) => {
      const pathname = url.pathname;
      const isProjectPage = pathname.includes("/projects/");
      const isNotSettings = !pathname.includes("/settings");
      return isProjectPage && isNotSettings;
    }, { timeout: 10000 });

    // Wait for project header to appear (indicates project loaded successfully)
    await this.page.locator('[data-testid="project-header"], h1').first().waitFor({ timeout: 10000 });
  }

  /**
   * Assert project name visible
   */
  async expectProjectNameVisible(name: string) {
    await expect(this.page.locator(`text="${name}"`).first()).toBeVisible();
  }
}
