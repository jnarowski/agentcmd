import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestWorkflowContext } from "@/server/test-utils/fixtures";
import { findOrCreateStep } from "./findOrCreateStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";

describe("findOrCreateStep", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  it("creates new step when not found", async () => {
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

    // Act
    const step = await findOrCreateStep({
      context,
      inngestStepId: "build-compile",
      stepName: "Compile",
      stepType: "command",
    });

    // Assert
    expect(step).toBeDefined();
    expect(step.workflow_run_id).toBe(execution.id);
    expect(step.name).toBe("Compile");
    expect(step.inngest_step_id).toBe("build-compile");
    expect(step.phase).toBe("build");
    expect(step.status).toBe("running"); // Steps are created as "running" since they execute immediately

    const dbStep = await prisma.workflowRunStep.findUnique({
      where: { id: step.id },
    });
    expect(dbStep).toBeDefined();
  });

  it("finds existing step instead of creating duplicate", async () => {
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

    // Act: Call twice with same step ID
    const step1 = await findOrCreateStep({
      context,
      inngestStepId: "build-compile",
      stepName: "Compile",
      stepType: "command",
    });
    const step2 = await findOrCreateStep({
      context,
      inngestStepId: "build-compile",
      stepName: "Compile",
      stepType: "command",
    });

    // Assert: Same step returned
    expect(step1.id).toBe(step2.id);

    const allSteps = await prisma.workflowRunStep.findMany({
      where: { workflow_run_id: execution.id },
    });
    expect(allSteps).toHaveLength(1);
  });
});
