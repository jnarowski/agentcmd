import { test, expect } from "../../fixtures";
import { NewWorkflowRunPage, WorkflowRunDetailPage } from "../../pages";

/**
 * Workflow Run Execution E2E Tests
 *
 * Comprehensive test for workflow run execution lifecycle:
 * - Creating a workflow run
 * - Monitoring real-time status updates via WebSocket
 * - Verifying AI step execution
 * - Confirming database state
 *
 * Uses pre-seeded fixture project with e2e-test-workflow definition.
 * Requires ANTHROPIC_API_KEY for AI execution.
 */

test.describe("Workflows - Run Execution", () => {
  test.setTimeout(120_000); // 2 minutes for AI execution

  test("should execute workflow run end-to-end", async ({
    authenticatedPage,
    db,
    prisma,
    testUser,
  }) => {
    // Use pre-seeded project from global setup
    const projectId = process.env.E2E_WORKFLOW_PROJECT_ID!;

    expect(projectId).toBeTruthy();

    // Trigger workflow refresh to ensure definition is loaded
    const response = await authenticatedPage.request.post(
      `/api/projects/${projectId}/workflows/refresh`,
      {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      }
    );
    if (!response.ok()) {
      const body = await response.text();
      console.log("Refresh failed:", response.status(), body);
    }
    expect(response.ok()).toBeTruthy();

    // Create spec file for workflow run
    const { specFile } = await db.seedSpecFile(
      process.env.E2E_WORKFLOW_PROJECT_PATH!,
      {
        title: "E2E Workflow Test",
        description: "Test spec for E2E workflow run execution",
      }
    );

    // Navigate to new run page
    const newRunPage = new NewWorkflowRunPage(authenticatedPage);
    await newRunPage.goto(projectId);

    // Wait for page to load
    await authenticatedPage.waitForLoadState("networkidle");

    // Select workflow definition
    await newRunPage.selectWorkflowDefinition("e2e-test-workflow");

    // Attach spec file to form
    await newRunPage.attachSpecFile(specFile.path);

    // Submit the form to create the run
    await newRunPage.submitForm();

    // Wait for navigation to run detail page
    const runDetailPage = new WorkflowRunDetailPage(authenticatedPage);
    await runDetailPage.expectOnRunDetailPage();

    // Get run ID from URL
    const runId = await runDetailPage.getRunId();
    expect(runId).toBeTruthy();

    // Wait for run to start (pending -> running)
    await runDetailPage.waitForStatus("Running", 30000);

    // Verify annotations appear as workflow progresses
    // Annotation 1: "Starting E2E test workflow execution"
    await runDetailPage.expectAnnotationVisible(
      "Starting E2E test workflow execution"
    );

    // Annotation 2: "Processing test workflow with AI step"
    await runDetailPage.expectAnnotationVisible(
      "Processing test workflow with AI step"
    );

    // Wait for workflow completion
    await runDetailPage.waitForStatus("Completed", 90000);

    // Annotation 3: "E2E test workflow completed successfully"
    await runDetailPage.expectAnnotationVisible(
      "E2E test workflow completed successfully"
    );

    // Verify artifact is created
    await runDetailPage.expectArtifactVisible("e2e-test-results.json");

    // Database verification: Check step types
    const steps = await prisma.workflowStep.findMany({
      where: { workflow_run_id: runId },
      select: { type: true, status: true },
    });

    // Verify we have the expected step types
    const stepTypes = steps.map((s) => s.type);
    expect(stepTypes).toContain("phase"); // 2 phase steps
    expect(stepTypes).toContain("annotation"); // 3 annotation steps
    expect(stepTypes).toContain("agent"); // 1 AI agent step
    expect(stepTypes).toContain("artifact"); // 1 artifact step

    // Verify all steps completed
    const allCompleted = steps.every((s) => s.status === "completed");
    expect(allCompleted).toBe(true);

    // Verify step counts
    const phasesCount = steps.filter((s) => s.type === "phase").length;
    const annotationsCount = steps.filter((s) => s.type === "annotation")
      .length;
    const agentStepsCount = steps.filter((s) => s.type === "agent").length;
    const artifactsCount = steps.filter((s) => s.type === "artifact").length;

    expect(phasesCount).toBe(2); // setup, execute
    expect(annotationsCount).toBe(3); // start, processing, complete
    expect(agentStepsCount).toBe(1); // run-test
    expect(artifactsCount).toBe(1); // test-results
  });
});
