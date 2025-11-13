import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestWorkflowContext } from "@/server/test-utils/fixtures";
import { createAnnotationStep } from "./createAnnotationStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";

vi.mock("@/server/websocket/infrastructure/subscriptions", () => ({
  broadcast: vi.fn(),
}));

describe("createAnnotationStep", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("creates annotation event in database with kebab-case ID", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const annotationStepFn = createAnnotationStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"],
    );

    // Act
    await annotationStepFn("progress-note", {
      message: "Compilation starting...",
    });

    // Assert
    const event = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "annotation_added",
      },
    });
    expect(event).toBeDefined();
    expect(event?.event_data).toMatchObject({
      message: "Compilation starting...",
    });
    expect(event?.phase).toBe("build");

    // Verify Inngest step ID uses slugified version
    expect(mockInngestStep.run).toHaveBeenCalledWith(
      expect.stringContaining("progress-note"),
      expect.any(Function),
    );
  });

  it("accepts sentence case and converts to kebab-case ID", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution 2", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test2",
      userId: "user-123",
      currentPhase: "test",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const annotationStepFn = createAnnotationStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"],
    );

    // Act
    await annotationStepFn("Running Tests", {
      message: "Test suite executing...",
    });

    // Assert
    const event = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "annotation_added",
      },
    });
    expect(event).toBeDefined();
    expect(event?.event_data).toMatchObject({
      message: "Test suite executing...",
    });

    // Verify Inngest step ID uses kebab-case conversion
    expect(mockInngestStep.run).toHaveBeenCalledWith(
      expect.stringContaining("running-tests"),
      expect.any(Function),
    );
  });

  it("both formats produce same Inngest step ID", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution 3", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test3",
      userId: "user-123",
      currentPhase: "deploy",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const annotationStepFn = createAnnotationStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"],
    );

    // Act - call with sentence case
    await annotationStepFn("Deploy Phase", {
      message: "Starting deployment...",
    });

    const firstCallId = mockInngestStep.run.mock.calls[0][0];

    // Act - call with kebab-case
    mockInngestStep.run.mockClear();
    await annotationStepFn("deploy-phase", {
      message: "Deployment complete",
    });

    const secondCallId = mockInngestStep.run.mock.calls[0][0];

    // Assert - both produce the same Inngest step ID
    expect(firstCallId).toBe(secondCallId);
    expect(firstCallId).toContain("deploy-phase");
  });
});
