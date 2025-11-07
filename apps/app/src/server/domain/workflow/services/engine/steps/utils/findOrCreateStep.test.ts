import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { findOrCreateStep } from "./findOrCreateStep";
import type { RuntimeContext } from "../../../../types/engine.types";

describe("findOrCreateStep", () => {
  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  it("creates new step when not found", async () => {
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

    // Act
    const step = await findOrCreateStep(context, "build-compile", "Compile");

    // Assert
    expect(step).toBeDefined();
    expect(step.workflow_run_id).toBe(execution.id);
    expect(step.name).toBe("Compile");
    expect(step.inngest_step_id).toBe("build-compile");
    expect(step.phase).toBe("build");
    expect(step.status).toBe("pending");

    const dbStep = await prisma.workflowRunStep.findUnique({
      where: { id: step.id },
    });
    expect(dbStep).toBeDefined();
  });

  it("finds existing step instead of creating duplicate", async () => {
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

    // Act: Call twice with same step ID
    const step1 = await findOrCreateStep(context, "build-compile", "Compile");
    const step2 = await findOrCreateStep(context, "build-compile", "Compile");

    // Assert: Same step returned
    expect(step1.id).toBe(step2.id);

    const allSteps = await prisma.workflowRunStep.findMany({
      where: { workflow_run_id: execution.id },
    });
    expect(allSteps).toHaveLength(1);
  });
});
