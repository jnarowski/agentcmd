import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * New Workflow Run Page Object
 *
 * Form for creating a new workflow run
 */
export class NewWorkflowRunPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}/workflows/new`);
  }

  /**
   * Select workflow definition
   */
  async selectWorkflowDefinition(identifier: string) {
    await this.getByTestId("workflow-definition-select").click();
    await this.page.locator(`[data-testid="workflow-option-${identifier}"], text="${identifier}"`).first().click();
  }

  /**
   * Fill run name
   */
  async fillRunName(name: string) {
    await this.getByTestId("workflow-run-name-input").fill(name);
  }

  /**
   * Attach spec file
   */
  async attachSpecFile(specFile: string) {
    await this.getByTestId("spec-file-input").fill(specFile);
  }

  /**
   * Submit form
   */
  async submitForm() {
    await this.getByTestId("workflow-run-submit").click();
  }

  /**
   * Create workflow run (full flow)
   */
  async createWorkflowRun(options: {
    workflowId: string;
    runName: string;
    specFile?: string;
  }) {
    await this.selectWorkflowDefinition(options.workflowId);
    await this.fillRunName(options.runName);
    if (options.specFile) {
      await this.attachSpecFile(options.specFile);
    }
    await this.submitForm();
  }
}
