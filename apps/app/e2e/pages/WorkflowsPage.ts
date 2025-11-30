import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Workflows Page Object
 *
 * Workflow kanban view with run cards
 */
export class WorkflowsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}/workflows`);
  }

  /**
   * Click New Run button
   */
  async clickNewRun() {
    await this.page.locator('button:has-text("New Run"), button:has-text("Create"), [data-testid="new-workflow-run"]').first().click();
  }

  /**
   * Get run card by ID or name
   */
  getRunCard(identifier: string): Locator {
    return this.getByTestId("workflow-run-card").filter({ hasText: identifier });
  }

  /**
   * Click run card to open details
   */
  async clickRunCard(identifier: string) {
    await this.getRunCard(identifier).first().click();
  }

  /**
   * Assert run visible in kanban
   */
  async expectRunVisible(identifier: string) {
    await expect(this.getRunCard(identifier).first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert run has status
   */
  async expectRunStatus(identifier: string, status: string) {
    const card = this.getRunCard(identifier).first();
    await expect(card.locator(`[data-testid="run-status-badge"]:has-text("${status}")`)).toBeVisible();
  }
}
