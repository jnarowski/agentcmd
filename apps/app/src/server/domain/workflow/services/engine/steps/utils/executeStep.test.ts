import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
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
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password_hash: "hash",
      },
    });
    const project = await prisma.project.create({
      data: { name: "Test Project", path: "/tmp/test" },
    });
    const workflow = await prisma.workflowDefinition.create({
      data: { 
        project_id: project.id,
        name: "test-workflow", 
        identifier: "test-workflow", 
        type: "code", 
        path: "/tmp/test.ts", 
        phases: [] 
      },
    });
    const execution = await prisma.workflowRun.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        workflow_definition_id: workflow.id,
        name: "Test Execution",
        args: {},
        status: "running",
      },
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
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password_hash: "hash",
      },
    });
    const project = await prisma.project.create({
      data: { name: "Test Project", path: "/tmp/test" },
    });
    const workflow = await prisma.workflowDefinition.create({
      data: { 
        project_id: project.id,
        name: "test-workflow", 
        identifier: "test-workflow", 
        type: "code", 
        path: "/tmp/test.ts", 
        phases: [] 
      },
    });
    const execution = await prisma.workflowRun.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        workflow_definition_id: workflow.id,
        name: "Test Execution",
        args: {},
        status: "running",
      },
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
});
