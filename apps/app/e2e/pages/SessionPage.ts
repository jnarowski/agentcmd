import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Session Page Object
 *
 * Page for viewing and interacting with an active session.
 * Handles message display, prompt input, and agent response waiting.
 */
export class SessionPage extends BasePage {
  // Test IDs for stable selectors
  private readonly testIds = {
    promptTextarea: "prompt-input-textarea",
    submitButton: "prompt-input-submit",
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to a specific session
   */
  async goto(projectId?: string, sessionId?: string) {
    if (projectId && sessionId) {
      await this.page.goto(`/projects/${projectId}/sessions/${sessionId}`);
    }
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
   * Get all message elements in the chat
   * Uses role-based selectors as messages have role="user" or role="assistant"
   */
  getMessages(): Locator {
    return this.page.locator('[data-message-role]');
  }

  /**
   * Get user messages
   */
  getUserMessages(): Locator {
    return this.page.locator('[data-message-role="user"]');
  }

  /**
   * Get assistant messages
   */
  getAssistantMessages(): Locator {
    return this.page.locator('[data-message-role="assistant"]');
  }

  /**
   * Wait for an assistant message to appear
   */
  async waitForAssistantMessage(timeout: number = 30000) {
    // Wait for any assistant message to appear
    await expect(this.getAssistantMessages().first()).toBeVisible({ timeout });
  }

  /**
   * Wait for message containing specific text
   */
  async waitForMessageContaining(text: string, timeout: number = 30000) {
    await expect(this.page.locator(`text="${text}"`).first()).toBeVisible({ timeout });
  }

  /**
   * Wait for streaming to complete (submit button returns to send state)
   */
  async waitForStreamingComplete(timeout: number = 60000) {
    // When streaming, the button shows a stop icon. When done, shows send icon.
    // We wait for the button to be enabled and not in streaming state
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('[data-testid="prompt-input-submit"]');
        if (!button) return false;
        // Check if button is enabled (not streaming)
        return !button.hasAttribute("disabled") &&
               !button.querySelector('[class*="animate-spin"]');
      },
      { timeout }
    );
  }

  /**
   * Assert specific number of messages
   */
  async expectMessageCount(count: number) {
    await expect(this.getMessages()).toHaveCount(count);
  }

  /**
   * Assert user message is visible
   */
  async expectUserMessageVisible(text: string) {
    const userMessages = this.getUserMessages();
    await expect(userMessages.filter({ hasText: text })).toBeVisible();
  }

  /**
   * Assert assistant message is visible
   */
  async expectAssistantMessageVisible() {
    await expect(this.getAssistantMessages().first()).toBeVisible();
  }

  /**
   * Assert session is in streaming state (button shows stop icon)
   */
  async expectStreaming() {
    // When streaming, button has a square stop icon
    await expect(this.getSubmitButton().locator("svg.lucide-square")).toBeVisible();
  }

  /**
   * Assert session is idle (ready for input)
   */
  async expectIdle() {
    // When idle, button has a send icon
    await expect(this.getSubmitButton().locator("svg.lucide-send")).toBeVisible();
  }

  /**
   * Get the session URL (for extracting session ID)
   */
  getSessionId(): string | null {
    const url = this.page.url();
    const match = url.match(/\/sessions\/([^/?]+)/);
    return match ? match[1] : null;
  }
}
