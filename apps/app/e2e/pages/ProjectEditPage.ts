import type { Page, Locator } from "@playwright/test";
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
    await this.page.goto(`/projects/${projectId}/edit`);
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
   * Click Save button
   */
  async clickSave() {
    await this.getByTestId("project-save-button").click();
  }

  /**
   * Click Cancel button
   */
  async clickCancel() {
    await this.page.locator('button:has-text("Cancel"), [data-testid="project-cancel-button"]').first().click();
  }

  /**
   * Assert on edit page
   */
  async expectOnEditPage(projectId: string) {
    await this.expectUrlContains(`/projects/${projectId}/edit`);
  }

  /**
   * Assert name input has value
   */
  async expectNameValue(name: string) {
    await expect(this.getByTestId("project-name-input")).toHaveValue(name);
  }
}
