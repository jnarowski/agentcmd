import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestWorkflowContext } from "@/server/test-utils/fixtures";
import { createPhaseStep } from "./createPhaseStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import * as updateWorkflowRunModule from "@/server/domain/workflow/services/runs/updateWorkflowRun";

vi.mock("../../runs/updateWorkflowRun");
vi.mock("@/server/websocket/infrastructure/subscriptions", () => ({
  broadcast: vi.fn(),
}));

describe("createPhaseStep", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("updates execution current_phase and creates phase events", async () => {
    // Arrange
    const mockUpdateWorkflowRun = vi.mocked(
      updateWorkflowRunModule.updateWorkflowRun
    );

    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
      config: {
        id: "test-workflow",
        name: "Test Workflow",
        phases: ["build"],
      },
    };

    const phaseStepFn = createPhaseStep(context);

    // Act
    const result = await phaseStepFn("build", async () => {
      return "build complete";
    });

    // Assert
    expect(result).toBe("build complete");
    expect(mockUpdateWorkflowRun).toHaveBeenCalledWith({
      runId: execution.id,
      data: { current_phase: "build" },
      logger: expect.anything(),
    });

    // Verify phase_started and phase_completed events created
    const events = await prisma.workflowEvent.findMany({
      where: {
        workflow_run_id: execution.id,
        phase: "build",
      },
      orderBy: { created_at: "asc" },
    });
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].event_type).toBe("phase_started");
    expect(events[events.length - 1].event_type).toBe("phase_completed");
  });

  it("sets context.currentPhase for nested step tagging", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
      config: {
        id: "test-workflow",
        name: "Test Workflow",
        phases: ["build"],
      },
    };

    const phaseStepFn = createPhaseStep(context);

    // Act
    await phaseStepFn("build", async () => {
      // Inside phase, currentPhase should be set
      expect(context.currentPhase).toBe("build");
      return "done";
    });

    // Assert: currentPhase persists after phase completes
    expect(context.currentPhase).toBe("build");
  });

  it("creates phase_failed event when phase function throws", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
      config: {
        id: "test-workflow",
        name: "Test Workflow",
        phases: ["build"],
      },
    };

    const phaseStepFn = createPhaseStep(context);

    // Act & Assert
    await expect(
      phaseStepFn("build", async () => {
        throw new Error("Build phase failed");
      })
    ).rejects.toThrow("Build phase failed");

    // Verify phase_failed event created
    const failedEvent = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "phase_failed",
        phase: "build",
      },
    });
    expect(failedEvent).toBeDefined();
    expect(failedEvent?.event_data).toMatchObject({
      error: "Build phase failed",
    });
  });

  it("accepts sentence case idOrName and converts to kebab-case for IDs", async () => {
    // Arrange
    const mockUpdateWorkflowRun = vi.mocked(
      updateWorkflowRunModule.updateWorkflowRun
    );

    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
      config: {
        id: "test-workflow",
        name: "Test Workflow",
        phases: ["run-tests"], // Kebab-case ID
      },
    };

    const phaseStepFn = createPhaseStep(context);

    // Act - Pass sentence case
    const result = await phaseStepFn("Run Tests", async () => {
      // Verify context.currentPhase uses kebab-case ID
      expect(context.currentPhase).toBe("run-tests");
      return "tests passed";
    });

    // Assert
    expect(result).toBe("tests passed");

    // Verify updateWorkflowRun called with kebab-case ID
    expect(mockUpdateWorkflowRun).toHaveBeenCalledWith({
      runId: execution.id,
      data: { current_phase: "run-tests" },
      logger: expect.anything(),
    });

    // Verify events created with kebab-case phase ID
    const events = await prisma.workflowEvent.findMany({
      where: {
        workflow_run_id: execution.id,
        phase: "run-tests", // Stored with kebab-case ID
      },
      orderBy: { created_at: "asc" },
    });
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].event_type).toBe("phase_started");

    // Event data should contain display name
    expect(events[0].event_data).toMatchObject({
      title: "Phase Started: Run Tests",
    });
  });

  it("accepts kebab-case idOrName and uses as-is", async () => {
    // Arrange
    const mockUpdateWorkflowRun = vi.mocked(
      updateWorkflowRunModule.updateWorkflowRun
    );

    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
      config: {
        id: "test-workflow",
        name: "Test Workflow",
        phases: ["deploy"],
      },
    };

    const phaseStepFn = createPhaseStep(context);

    // Act - Pass kebab-case
    const result = await phaseStepFn("deploy", async () => {
      expect(context.currentPhase).toBe("deploy");
      return "deployed";
    });

    // Assert
    expect(result).toBe("deployed");
    expect(mockUpdateWorkflowRun).toHaveBeenCalledWith({
      runId: execution.id,
      data: { current_phase: "deploy" },
      logger: expect.anything(),
    });

    const events = await prisma.workflowEvent.findMany({
      where: {
        workflow_run_id: execution.id,
        phase: "deploy",
      },
      orderBy: { created_at: "asc" },
    });
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].event_type).toBe("phase_started");

    // Display name converted to title case by toName()
    expect(events[0].event_data).toMatchObject({
      title: "Phase Started: Deploy",
    });
  });
});
