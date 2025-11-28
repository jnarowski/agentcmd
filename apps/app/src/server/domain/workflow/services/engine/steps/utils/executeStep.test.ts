import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestWorkflowContext } from "@/server/test-utils/fixtures";
import { executeStep } from "./executeStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";

describe("executeStep", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("creates step and updates status through lifecycle", async () => {
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
      run: vi.fn((id, fn) => fn()),
    };

    const stepFn = vi.fn().mockResolvedValue("success");

    // Act
    const result = await executeStep({
      context,
      stepId: "compile",
      stepName: "Compile Code",
      stepType: "command",
      fn: stepFn,
      inngestStep: mockInngestStep as RuntimeContext["inngestStep"],
    });

    // Assert
    expect(result.result).toBe("success");
    expect(result.runStepId).toBeDefined();
    expect(stepFn).toHaveBeenCalledTimes(1);
    expect(mockInngestStep.run).toHaveBeenCalledWith(
      "build-compile",
      expect.any(Function)
    );

    const step = await prisma.workflowRunStep.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "Compile Code",
      },
    });
    expect(step).toBeDefined();
    expect(step?.status).toBe("completed");
    expect(step?.started_at).toBeInstanceOf(Date);
    expect(step?.completed_at).toBeInstanceOf(Date);
  });

  it("marks step as failed when step function throws", async () => {
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
      run: vi.fn((id, fn) => fn()),
    };

    const stepFn = vi.fn().mockRejectedValue(new Error("Build failed"));

    // Act & Assert
    await expect(
      executeStep({
        context,
        stepId: "compile",
        stepName: "Compile Code",
        stepType: "command",
        fn: stepFn,
        inngestStep: mockInngestStep as RuntimeContext["inngestStep"],
      })
    ).rejects.toThrow("Build failed");

    const step = await prisma.workflowRunStep.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "Compile Code",
      },
    });
    expect(step).toBeDefined();
    expect(step?.status).toBe("failed");
    expect(step?.error_message).toBe("Build failed");
  });

  it("marks step as failed when result has success: false (no throw)", async () => {
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
      run: vi.fn((id, fn) => fn()),
    };

    // Return success: false instead of throwing
    const stepFn = vi.fn().mockResolvedValue({
      success: false,
      error: "Docker not available",
      data: { status: "failed" }
    });

    // Act - should NOT throw, but return the result
    const result = await executeStep({
      context,
      stepId: "preview",
      stepName: "Preview Container",
      stepType: "preview",
      fn: stepFn,
      inngestStep: mockInngestStep as RuntimeContext["inngestStep"],
    });

    // Assert - result returned, step marked as failed
    expect(result.result.success).toBe(false);
    expect(result.result.error).toBe("Docker not available");

    const step = await prisma.workflowRunStep.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "Preview Container",
      },
    });
    expect(step?.status).toBe("failed");
  });
});
