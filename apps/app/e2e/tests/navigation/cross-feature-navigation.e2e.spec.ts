import { test, expect } from "../../fixtures";
import {
  ProjectsPage,
  ProjectDetailPage,
  WorkflowsPage,
  SessionPage,
} from "../../pages";

/**
 * Cross-Feature Navigation E2E Tests
 *
 * Tests navigation between different features:
 * - Projects → Project Detail
 * - Project Detail → Workflows
 * - Workflows → Sessions
 * - Breadcrumb navigation
 * - Browser back button
 */

test.describe("Navigation - Cross-Feature", () => {
  test.skip("should navigate between features correctly", async ({
    authenticatedPage,
    db,
  }) => {
    // ======== ARRANGE ========
    // Seed project
    const project = await db.seedProject({
      name: `Nav Test ${Date.now()}`,
    });

    // Seed workflow definition
    await db.seedWorkflowDefinition({
      projectId: project.id,
      identifier: "test-workflow",
      name: "Test Workflow",
      description: "Workflow for navigation testing",
      phases: [],
    });

    // Seed session
    const session = await db.seedSession({
      projectId: project.id,
      name: `Test Session ${Date.now()}`,
    });

    // Create page objects
    const projectsPage = new ProjectsPage(authenticatedPage);
    const projectDetailPage = new ProjectDetailPage(authenticatedPage);
    const workflowsPage = new WorkflowsPage(authenticatedPage);

    // ======== ACT - Navigate Projects → Project Detail ========
    await projectsPage.goto();
    await projectsPage.expectOnProjectsPage();
    await projectsPage.openProject(project.id);

    // ======== ASSERT - On Project Home ========
    await projectDetailPage.expectOnProjectPage();

    // ======== ACT - Navigate to Workflows ========
    await projectDetailPage.clickTab("workflows");

    // ======== ASSERT - On Workflows Page ========
    await workflowsPage.expectOnWorkflowsPage();

    // ======== ACT - Navigate to Sessions ========
    await projectDetailPage.clickTab("sessions");

    // ======== ASSERT - Session Card Visible ========
    await expect(
      authenticatedPage.getByTestId("session-card").first()
    ).toBeVisible({ timeout: 5000 });

    // ======== ACT - Use Breadcrumb to Return Home ========
    await projectDetailPage.clickBreadcrumb("project");

    // ======== ASSERT - Back on Project Home ========
    await projectDetailPage.expectOnProjectPage();

    // ======== ACT - Test Browser Back Button ========
    await authenticatedPage.goBack();

    // ======== ASSERT - Returns to Sessions ========
    await expect(
      authenticatedPage.getByTestId("session-card").first()
    ).toBeVisible({ timeout: 5000 });
  });
});
