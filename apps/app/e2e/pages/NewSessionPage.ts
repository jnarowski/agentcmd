import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * New Session Page Object
 *
 * Page for creating a new session with an AI agent.
 * Handles prompt input, agent selection, and session creation.
 */
export class NewSessionPage extends BasePage {
  // Test IDs for stable selectors
  private readonly testIds = {
    promptTextarea: "prompt-input-textarea",
    submitButton: "prompt-input-submit",
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to new session page for a project
   */
  async goto(projectId?: string) {
    if (projectId) {
      await this.page.goto(`/projects/${projectId}/sessions/new`);
    } else {
      // Navigate via sidebar or default route
      await this.page.goto("/sessions/new");
    }
  }

  /**
   * Navigate to new session page using project path
   */
  async gotoForProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/sessions/new`);
  }

  /**
   * Get the prompt textarea
   */
  getPromptTextarea() {
    return this.getByTestId(this.testIds.promptTextarea);
  }

  /**
   * Get the submit button
   */
  getSubmitButton() {
    return this.getByTestId(this.testIds.submitButton);
  }

  /**
   * Type a message in the prompt textarea
   */
  async typeMessage(message: string) {
    await this.getPromptTextarea().fill(message);
  }

  /**
   * Submit the prompt
   */
  async submitPrompt() {
    await this.getSubmitButton().click();
  }

  /**
   * Type a message and submit it
   */
  async sendMessage(message: string) {
    await this.typeMessage(message);
    await this.submitPrompt();
  }

  /**
   * Wait for navigation to session page after submitting
   */
  async waitForSessionCreated() {
    // After creating a session, URL changes to /projects/{projectId}/sessions/{sessionId}
    await this.page.waitForURL(/\/projects\/[^/]+\/sessions\/[^/]+$/);
  }

  /**
   * Assert page title contains "New Session"
   */
  async expectNewSessionPage() {
    await expect(this.page.locator("h2:has-text('Start a New Session')")).toBeVisible();
  }

  /**
   * Assert WebSocket is connected (submit button is enabled)
   */
  async expectWebSocketConnected() {
    await expect(this.getSubmitButton()).toBeEnabled();
  }

  /**
   * Assert WebSocket is disconnected (submit button is disabled)
   */
  async expectWebSocketDisconnected() {
    await expect(this.getSubmitButton()).toBeDisabled();
  }
}
