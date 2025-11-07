import { describe, it, expect, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { updateStepStatus } from "./updateStepStatus";
import type { RuntimeContext } from "../../../../types/engine.types";
import * as createWorkflowEventModule from "../../../events/createWorkflowEvent";

vi.mock("../../../events/createWorkflowEvent");

describe("updateStepStatus", () => {
  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("updates step to completed with timestamp", async () => {
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
    const step = await prisma.workflowRunStep.create({
      data: {
        workflow_run_id: execution.id,
        inngest_step_id: "test-step",
        name: "Test Step",
        phase: "test-phase",
        status: "running",
        started_at: new Date(),
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

    // Act
    await updateStepStatus(context, step.id, "completed");

    // Assert
    const updatedStep = await prisma.workflowRunStep.findUnique({
      where: { id: step.id },
    });
    expect(updatedStep?.status).toBe("completed");
    expect(updatedStep?.completed_at).toBeInstanceOf(Date);
  });

  it("updates step to failed with error message and creates event", async () => {
    // Arrange
    const mockCreateWorkflowEvent = vi.mocked(
      createWorkflowEventModule.createWorkflowEvent
    );

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
    const step = await prisma.workflowRunStep.create({
      data: {
        workflow_run_id: execution.id,
        inngest_step_id: "test-step",
        name: "Test Step",
        phase: "test-phase",
        status: "running",
        started_at: new Date(),
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

    // Act
    await updateStepStatus(
      context,
      step.id,
      "failed",
      undefined,
      "Something went wrong"
    );

    // Assert
    const updatedStep = await prisma.workflowRunStep.findUnique({
      where: { id: step.id },
    });
    expect(updatedStep?.status).toBe("failed");
    expect(updatedStep?.error_message).toBe("Something went wrong");
    expect(updatedStep?.completed_at).toBeInstanceOf(Date);

    expect(mockCreateWorkflowEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_run_id: execution.id,
        event_type: "step_failed",
      })
    );
  });

  it("updates step to running with started_at timestamp", async () => {
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
    const step = await prisma.workflowRunStep.create({
      data: {
        workflow_run_id: execution.id,
        inngest_step_id: "test-step",
        name: "Test Step",
        phase: "test-phase",
        status: "pending",
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

    // Act
    await updateStepStatus(context, step.id, "running");

    // Assert
    const updatedStep = await prisma.workflowRunStep.findUnique({
      where: { id: step.id },
    });
    expect(updatedStep?.status).toBe("running");
    expect(updatedStep?.started_at).toBeInstanceOf(Date);
    expect(updatedStep?.completed_at).toBeNull();
  });
});
