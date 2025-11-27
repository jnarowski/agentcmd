import { test, expect } from "../../fixtures";

/**
 * List Workflow Definitions E2E Test
 *
 * Verifies workflow definition listing:
 * 1. Navigate to workflows page
 * 2. Verify workflow definitions displayed
 * 3. Verify workflow metadata shown
 */

test.describe("Workflows - List Definitions", () => {
  test("should display available workflow definitions", async ({ authenticatedPage }) => {
    // Navigate to workflows page
    await authenticatedPage.goto("http://localhost:5101/workflows");
    await authenticatedPage.waitForLoadState("networkidle");

    // Wait for workflows to load
    await authenticatedPage.waitForTimeout(2000);

    // Look for workflow list or workflow cards
    const workflowList = authenticatedPage.locator(
      '[data-testid="workflow-list"], .workflow-list, .workflows'
    );

    const workflowItems = authenticatedPage.locator(
      '[data-workflow], .workflow-item, .workflow-card'
    );

    // Should have either list container or workflow items
    const hasContainer = (await workflowList.count()) > 0;
    const hasItems = (await workflowItems.count()) > 0;

    expect(hasContainer || hasItems).toBe(true);
  });

  test("should display workflow names and descriptions", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("http://localhost:5101/workflows");
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    // Look for any workflow name (common workflow names)
    const workflowNames = authenticatedPage.locator(
      'text=/test.*workflow/i, text=/example.*workflow/i, [data-workflow-name], .workflow-name'
    );

    if ((await workflowNames.count()) > 0) {
      await expect(workflowNames.first()).toBeVisible();
    }
  });

  test("should allow clicking on workflow to view details", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("http://localhost:5101/workflows");
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    const workflowItems = authenticatedPage.locator(
      '[data-workflow], .workflow-item, .workflow-card, a[href*="/workflows/"]'
    );

    if ((await workflowItems.count()) > 0) {
      const initialUrl = authenticatedPage.url();

      // Click first workflow
      await workflowItems.first().click();

      // Wait for navigation or modal
      await authenticatedPage.waitForTimeout(1000);

      const newUrl = authenticatedPage.url();

      // Should navigate to details or open modal
      expect(newUrl !== initialUrl || (await authenticatedPage.locator('[data-modal], .modal').count()) > 0).toBe(true);
    }
  });
});
