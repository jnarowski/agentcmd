import { test, expect } from "../../fixtures";
import {
  WorkflowsPage,
  NewWorkflowRunPage,
  WorkflowRunDetailPage,
} from "../../pages";

/**
 * Workflow Run Execution E2E Tests
 *
 * Tests full workflow execution including:
 * - Creating workflow run with spec file
 * - Monitoring WebSocket events
 * - Verifying status transitions
 * - Checking annotations, steps, and artifacts
 * - Database verification
 */

test.describe("Workflows - Run Execution", () => {
  test.setTimeout(60000); // Workflow execution can take time

  test.skip("should execute workflow run end-to-end", async ({
    authenticatedPage,
    db,
  }) => {
    // ======== ARRANGE ========
    // Seed project with fixture (includes e2e-test-workflow.ts)
    const { project, projectPath } = await db.seedTestProject({
      name: `E2E Workflow Test ${Date.now()}`,
      copyFixture: true,
    });

    // Create spec file in project
    const { specFile } = await db.seedSpecFile({
      projectPath,
      specContent: "# Test Spec\n\nTest feature for e2e testing",
    });

    // Seed workflow definition
    const workflowDef = await db.seedWorkflowDefinition({
      projectId: project.id,
      identifier: "e2e-test-workflow",
      name: "E2E Test Workflow",
      description: "Test workflow with AI and annotation steps",
      phases: [
        { name: "Setup", steps: [] },
        { name: "Execute", steps: [] },
        { name: "Complete", steps: [] },
      ],
    });

    // Create page objects
    const workflowsPage = new WorkflowsPage(authenticatedPage);
    const newRunPage = new NewWorkflowRunPage(authenticatedPage);
    const runDetailPage = new WorkflowRunDetailPage(authenticatedPage);

    // ======== ACT ========
    // Navigate to new run page
    await newRunPage.goto(project.id);

    // Fill form and create run
    await newRunPage.createWorkflowRun({
      workflowId: workflowDef.identifier,
      runName: `Test Run ${Date.now()}`,
      specFile,
    });

    // Wait for navigation to run detail page
    await runDetailPage.expectOnRunDetailPage();

    // ======== ASSERT ========
    // Verify initial status
    await runDetailPage.expectStatus("pending");

    // Wait for workflow to start
    await runDetailPage.waitForStatus("running", 10000);

    // Wait for completion
    await runDetailPage.waitForStatus("completed", 45000);

    // Verify annotations visible (e2e-test-workflow has 5 annotations)
    await runDetailPage.expectAnnotationVisible("Starting workflow setup");
    await runDetailPage.expectAnnotationVisible("Workflow execution complete");

    // Verify steps visible
    await runDetailPage.expectStepVisible("generate-summary");
    await runDetailPage.expectStepVisible("generate-tasks");

    // Verify artifact visible
    await runDetailPage.expectArtifactVisible("e2e-test-results.json");

    // Database verification
    const runId = runDetailPage.getRunId();
    const dbRun = await db.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        steps: true,
      },
    });

    expect(dbRun?.status).toBe("completed");
    expect(dbRun?.steps.filter((s) => s.step_type === "ai")).toHaveLength(2);
    expect(dbRun?.steps.filter((s) => s.step_type === "annotation")).toHaveLength(5);
    expect(dbRun?.steps.filter((s) => s.step_type === "artifact")).toHaveLength(1);

    // Navigate back to workflows page
    await workflowsPage.goto(project.id);

    // Verify run card displays
    await workflowsPage.expectRunVisible(runId);
    await workflowsPage.expectRunStatus(runId, "completed");
  });
});
