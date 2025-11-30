import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Project Edit Page Object
 *
 * Form for editing project name and path
 */
export class ProjectEditPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}/settings`);
  }

  /**
   * Fill project name
   */
  async fillName(name: string) {
    await this.getByTestId("project-name-input").fill(name);
  }

  /**
   * Fill project path
   */
  async fillPath(path: string) {
    await this.getByTestId("project-path-input").fill(path);
  }

  /**
   * Click Save button and wait for success toast
   */
  async clickSave() {
    await this.getByTestId("project-save-button").click();
    // Wait for success toast to confirm save completed
    await this.page.locator('text="Project updated successfully"').waitFor({ timeout: 10000 });
  }

  /**
   * Click Cancel button
   */
  async clickCancel() {
    await this.page.locator('button:has-text("Cancel"), [data-testid="project-cancel-button"]').first().click();
  }

  /**
   * Assert on edit page (settings)
   */
  async expectOnEditPage() {
    await this.expectUrlContains(`/settings`);
  }

  /**
   * Assert name input has value
   */
  async expectNameValue(name: string) {
    await expect(this.getByTestId("project-name-input")).toHaveValue(name);
  }
}
