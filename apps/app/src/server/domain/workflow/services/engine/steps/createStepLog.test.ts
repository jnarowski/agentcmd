import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestWorkflowContext } from "@/server/test-utils/fixtures";
import { createStepLog } from "./createStepLog";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";

vi.mock("@/server/websocket/infrastructure/subscriptions", () => ({
  broadcast: vi.fn(),
}));

describe("createStepLog", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("creates info level log event in database", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    let currentStepId: string | null = "build:test-step";
    const log = createStepLog(context, () => currentStepId);

    // Act
    log("Hello", "World");
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for async event creation

    // Assert
    const event = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "step_log",
      },
    });
    expect(event).toBeDefined();
    expect(event?.event_data).toMatchObject({
      level: "info",
      message: "Hello World",
    });
    expect(event?.inngest_step_id).toBe("build:test-step");
    expect(event?.phase).toBe("build");
  });

  it("creates warn level log event", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "test",
      logger: console as unknown as RuntimeContext["logger"],
    };

    let currentStepId: string | null = "test:validation";
    const log = createStepLog(context, () => currentStepId);

    // Act
    log.warn("Warning message");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    const event = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "step_log",
      },
    });
    expect(event).toBeDefined();
    expect(event?.event_data).toMatchObject({
      level: "warn",
      message: "Warning message",
    });
  });

  it("creates error level log event", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "deploy",
      logger: console as unknown as RuntimeContext["logger"],
    };

    let currentStepId: string | null = "deploy:publish";
    const log = createStepLog(context, () => currentStepId);

    // Act
    log.error("Error occurred");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    const event = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "step_log",
      },
    });
    expect(event).toBeDefined();
    expect(event?.event_data).toMatchObject({
      level: "error",
      message: "Error occurred",
    });
  });

  it("serializes object arguments to JSON", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    let currentStepId: string | null = null;
    const log = createStepLog(context, () => currentStepId);

    const testObject = { foo: "bar", count: 42 };

    // Act
    log("Data:", testObject);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    const event = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "step_log",
      },
    });
    expect(event).toBeDefined();
    expect(event?.event_data).toMatchObject({
      level: "info",
      message: expect.stringContaining('"foo": "bar"'),
    });
    expect(event?.event_data).toMatchObject({
      message: expect.stringContaining('"count": 42'),
    });
  });

  it("handles null currentStepId", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: null,
      logger: console as unknown as RuntimeContext["logger"],
    };

    let currentStepId: string | null = null;
    const log = createStepLog(context, () => currentStepId);

    // Act
    log("Log without step");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    const event = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "step_log",
      },
    });
    expect(event).toBeDefined();
    expect(event?.inngest_step_id).toBeNull();
    expect(event?.phase).toBeNull();
  });

  it("uses current step ID from getter function", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    let currentStepId: string | null = "build:step-1";
    const log = createStepLog(context, () => currentStepId);

    // Act - log with step-1
    log("First log");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Change current step ID
    currentStepId = "build:step-2";

    // Act - log with step-2
    log("Second log");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    const events = await prisma.workflowEvent.findMany({
      where: {
        workflow_run_id: execution.id,
        event_type: "step_log",
      },
      orderBy: { created_at: "asc" },
    });
    expect(events).toHaveLength(2);
    expect(events[0]?.inngest_step_id).toBe("build:step-1");
    expect(events[1]?.inngest_step_id).toBe("build:step-2");
  });

  it("concatenates multiple arguments with space separator", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "test",
      logger: console as unknown as RuntimeContext["logger"],
    };

    let currentStepId: string | null = null;
    const log = createStepLog(context, () => currentStepId);

    // Act
    log("Testing", "multiple", "arguments", 123);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    const event = await prisma.workflowEvent.findFirst({
      where: {
        workflow_run_id: execution.id,
        event_type: "step_log",
      },
    });
    expect(event).toBeDefined();
    expect(event?.event_data).toMatchObject({
      message: "Testing multiple arguments 123",
    });
  });

  it("does not block execution on event creation failure", async () => {
    // Arrange
    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} },
    });

    const mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(() => mockLogger),
    };

    const context: RuntimeContext = {
      runId: "invalid-run-id", // This will cause event creation to fail
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "build",
      logger: mockLogger as unknown as RuntimeContext["logger"],
    };

    let currentStepId: string | null = "build:test";
    const log = createStepLog(context, () => currentStepId);

    // Act - should not throw
    expect(() => {
      log("This should not throw");
    }).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert - error should be logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        stepId: "build:test",
        level: "info",
      }),
      "Failed to create step_log event"
    );
  });
});
