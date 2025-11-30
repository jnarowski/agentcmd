import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Workflow Run Detail Page Object
 *
 * Detail view for individual workflow run with steps, annotations, artifacts
 */
export class WorkflowRunDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(projectId: string, runId: string) {
    await this.page.goto(`/projects/${projectId}/workflows/runs/${runId}`);
  }

  /**
   * Get status badge
   */
  getStatusBadge(): Locator {
    return this.getByTestId("workflow-run-status-badge");
  }

  /**
   * Assert status
   */
  async expectStatus(status: string) {
    await expect(this.getStatusBadge()).toHaveText(status, { timeout: 10000 });
  }

  /**
   * Wait for status (with timeout)
   */
  async waitForStatus(status: string, timeout = 60000) {
    await expect(this.getStatusBadge()).toHaveText(status, { timeout });
  }

  /**
   * Get current phase indicator
   */
  getCurrentPhase(): Locator {
    return this.getByTestId("current-phase-indicator");
  }

  /**
   * Assert current phase
   */
  async expectPhase(phase: string) {
    await expect(this.getCurrentPhase()).toContainText(phase);
  }

  /**
   * Get workflow step card by ID
   */
  getStepCard(stepId: string): Locator {
    return this.getByTestId("workflow-step-card").filter({ hasText: stepId });
  }

  /**
   * Assert step visible
   */
  async expectStepVisible(stepId: string) {
    await expect(this.getStepCard(stepId)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert step status
   */
  async expectStepStatus(stepId: string, status: string) {
    const step = this.getStepCard(stepId);
    await expect(step.locator('[data-testid="step-status-badge"]')).toContainText(status);
  }

  /**
   * Assert annotation visible with message
   */
  async expectAnnotationVisible(message: string) {
    const annotation = this.getByTestId("annotation-message").filter({ hasText: message });
    await expect(annotation).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert artifact visible
   */
  async expectArtifactVisible(filename: string) {
    const artifact = this.getByTestId("artifact-card").filter({ hasText: filename });
    await expect(artifact).toBeVisible({ timeout: 10000 });
  }
}
