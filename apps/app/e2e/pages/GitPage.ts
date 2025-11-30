import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Git Page Object
 *
 * Git operations page with Changes, History, and Branches tabs
 */
export class GitPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}/git`);
  }

  /**
   * Click tab (Changes, History, Branches)
   */
  async clickTab(tabName: "Changes" | "History" | "Branches") {
    await this.page.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first().click();
  }

  // ========================================
  // Changes Tab
  // ========================================

  /**
   * Get unstaged files list
   */
  getUnstagedFiles(): Locator {
    return this.getByTestId("unstaged-file");
  }

  /**
   * Stage a file
   */
  async stageFile(filename: string) {
    const file = this.getUnstagedFiles().filter({ hasText: filename });
    await file.locator('button:has-text("Stage"), [data-testid="stage-button"]').first().click();
  }

  /**
   * Fill commit message
   */
  async fillCommitMessage(message: string) {
    await this.getByTestId("commit-message-input").fill(message);
  }

  /**
   * Click commit button
   */
  async clickCommit() {
    await this.getByTestId("commit-button").click();
  }

  // ========================================
  // History Tab
  // ========================================

  /**
   * Get commit card
   */
  getCommitCard(message: string): Locator {
    return this.getByTestId("commit-card").filter({ hasText: message });
  }

  /**
   * Assert commit visible in history
   */
  async expectCommitVisible(message: string) {
    await expect(this.getCommitCard(message)).toBeVisible({ timeout: 10000 });
  }

  // ========================================
  // Branches Tab
  // ========================================

  /**
   * Click Create Branch button
   */
  async clickCreateBranch() {
    await this.page.locator('button:has-text("Create Branch"), [data-testid="create-branch-button"]').first().click();
  }

  /**
   * Fill branch name
   */
  async fillBranchName(name: string) {
    await this.getByTestId("branch-name-input").fill(name);
  }

  /**
   * Submit branch creation
   */
  async submitBranch() {
    await this.getByTestId("branch-submit-button").click();
  }

  /**
   * Get current branch badge
   */
  getCurrentBranch(): Locator {
    return this.getByTestId("current-branch-badge");
  }

  /**
   * Assert current branch
   */
  async expectCurrentBranch(branchName: string) {
    await expect(this.getCurrentBranch()).toContainText(branchName);
  }
}
