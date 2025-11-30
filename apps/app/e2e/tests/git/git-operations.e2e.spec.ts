import { test, expect } from "../../fixtures";
import { GitPage } from "../../pages";

/**
 * Git Operations E2E Tests
 *
 * Tests git functionality including:
 * - Staging file changes
 * - Committing with message
 * - Verifying in history
 * - Creating branches
 * - Switching branches
 */

test.describe("Git - Operations", () => {
  test.skip("should stage, commit, and create branch", async ({
    authenticatedPage,
    db,
  }) => {
    // ======== ARRANGE ========
    // Seed project with fixture (includes git repo)
    const { project, projectPath } = await db.seedTestProject({
      name: `Git Test ${Date.now()}`,
      copyFixture: true,
    });

    // Create a file change
    await db.seedFileChange({
      projectPath,
      filename: "test-file.txt",
      content: "Test content for git operations",
    });

    // Create page object
    const gitPage = new GitPage(authenticatedPage);

    // ======== ACT - Commit ========
    // Navigate to git page
    await gitPage.goto(project.id);

    // Verify Changes tab is active and has 1 unstaged file
    const unstagedFiles = await gitPage.getUnstagedFiles();
    expect(await unstagedFiles.count()).toBe(1);

    // Stage the file
    await gitPage.stageFile("test-file.txt");

    // Fill commit message and commit
    await gitPage.fillCommitMessage("Add test file");
    await gitPage.clickCommit();

    // ======== ASSERT - Commit ========
    // Navigate to History tab
    await gitPage.clickTab("history");

    // Verify commit visible
    await gitPage.expectCommitVisible("Add test file");

    // ======== ACT - Branch ========
    // Navigate to Branches tab
    await gitPage.clickTab("branches");

    // Create new branch
    const branchName = "test-branch";
    await gitPage.clickCreateBranch();
    await gitPage.fillBranchName(branchName);
    await gitPage.submitBranch();

    // ======== ASSERT - Branch ========
    // Verify current branch badge updated
    const currentBranch = await gitPage.getCurrentBranch();
    expect(currentBranch).toBe(branchName);
  });
});
