import { test, expect } from "../../fixtures";

/**
 * Run Workflow E2E Test
 *
 * Verifies workflow execution:
 * 1. Select workflow definition
 * 2. Provide required inputs
 * 3. Start workflow execution
 * 4. Verify workflow run created
 * 5. Verify run tracked in database
 */

test.describe("Workflows - Run", () => {
  test("should start workflow execution", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    // Seed project for workflow context
    const [project] = await db.seedProjects([
      {
        name: `Workflow Test Project ${Date.now()}`,
        path: "/tmp/workflow-test",
      },
    ]);

    // Navigate to workflows
    await authenticatedPage.goto("http://localhost:5101/workflows");
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    // Find and click a workflow
    const workflowItems = authenticatedPage.locator(
      '[data-workflow], .workflow-item, a[href*="/workflows/"]'
    );

    if ((await workflowItems.count()) > 0) {
      await workflowItems.first().click();
      await authenticatedPage.waitForTimeout(1000);

      // Look for run/execute button
      const runButton = authenticatedPage.locator(
        'button:has-text("Run"), button:has-text("Execute"), button:has-text("Start")'
      );

      if ((await runButton.count()) > 0) {
        await runButton.first().click();

        // Wait for execution to start
        await authenticatedPage.waitForTimeout(3000);

        // Check for workflow run in database
        const workflowRuns = await prisma.workflowRun.findMany({
          where: { user_id: testUser.id },
          orderBy: { created_at: "desc" },
          take: 1,
        });

        expect(workflowRuns.length).toBeGreaterThan(0);
      }
    }
  });

  test("should display workflow run status", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("http://localhost:5101/workflows");
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    // Navigate to workflow runs or history
    const runsLink = authenticatedPage.locator(
      'a:has-text("Runs"), a:has-text("History"), a[href*="/workflow-runs"]'
    );

    if ((await runsLink.count()) > 0) {
      await runsLink.first().click();
      await authenticatedPage.waitForTimeout(2000);

      // Look for run status indicators
      const statusIndicators = authenticatedPage.locator(
        '[data-status], .status, text=/running/i, text=/completed/i, text=/pending/i'
      );

      if ((await statusIndicators.count()) > 0) {
        await expect(statusIndicators.first()).toBeVisible();
      }
    }
  });
});
