import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createRunStep } from "./createRunStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";

describe("createRunStep", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("executes function and tracks status in database", async () => {
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
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const runStepFn = createRunStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    const result = await runStepFn("custom-step", async () => {
      return { data: "result" };
    });

    // Assert
    expect(result).toEqual({ data: "result" });

    const step = await prisma.workflowRunStep.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "Custom Step", // Name is converted by toName()
      },
    });
    expect(step).toBeDefined();
    expect(step?.status).toBe("completed");
  });

  it("handles failure and marks step as failed", async () => {
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
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const runStepFn = createRunStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act & Assert
    await expect(
      runStepFn("failing-step", async () => {
        throw new Error("Step failed");
      })
    ).rejects.toThrow("Step failed");

    const step = await prisma.workflowRunStep.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "Failing Step", // Name is converted by toName()
      },
    });
    expect(step).toBeDefined();
    expect(step?.status).toBe("failed");
    expect(step?.error_message).toBe("Step failed");
  });

  it("accepts sentence case idOrName and converts to kebab-case", async () => {
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
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => {
        // Verify kebab-case ID in Inngest step ID
        expect(id).toContain("validate-data");
        return fn();
      }),
    };

    const runStepFn = createRunStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act - Pass sentence case
    const result = await runStepFn("Validate Data", async () => {
      return { valid: true };
    });

    // Assert
    expect(result).toEqual({ valid: true });

    const step = await prisma.workflowRunStep.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "Validate Data", // Name stored as display name
      },
    });
    expect(step).toBeDefined();
    expect(step?.status).toBe("completed");
  });

  it("accepts kebab-case idOrName and uses as-is", async () => {
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
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => {
        expect(id).toContain("process-results");
        return fn();
      }),
    };

    const runStepFn = createRunStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act - Pass kebab-case
    const result = await runStepFn("process-results", async () => {
      return { processed: true };
    });

    // Assert
    expect(result).toEqual({ processed: true });

    const step = await prisma.workflowRunStep.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "Process Results", // Name converted from kebab-case
      },
    });
    expect(step).toBeDefined();
    expect(step?.status).toBe("completed");
  });
});
