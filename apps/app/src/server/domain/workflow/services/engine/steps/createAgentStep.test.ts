import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestWorkflowContext } from "@/server/test-utils/fixtures";
import { createAgentStep } from "./createAgentStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import * as executeAgentModule from "@/server/domain/session/services/executeAgent";
import * as createSessionModule from "@/server/domain/session/services/createSession";
import * as updateSessionModule from "@/server/domain/session/services/updateSession";
import * as findOrCreateStepModule from "@/server/domain/workflow/services/engine/steps/utils/findOrCreateStep";
import * as updateStepStatusModule from "@/server/domain/workflow/services/engine/steps/utils/updateStepStatus";
import * as handleStepFailureModule from "@/server/domain/workflow/services/engine/steps/utils/handleStepFailure";

vi.mock("@/server/domain/session/services/executeAgent");
vi.mock("@/server/domain/session/services/createSession");
vi.mock("@/server/domain/session/services/updateSession");
vi.mock("@/server/domain/workflow/services/steps/updateWorkflowStep");
vi.mock("@/server/domain/session/services/storeCliSessionId");
vi.mock("@/server/domain/workflow/services/engine/steps/utils/findOrCreateStep");
vi.mock("@/server/domain/workflow/services/engine/steps/utils/updateStepStatus");
vi.mock("@/server/domain/workflow/services/engine/steps/utils/handleStepFailure");
vi.mock("@/server/websocket/infrastructure/subscriptions", () => ({
  broadcast: vi.fn(),
}));

describe("createAgentStep", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("creates session and executes agent with correct args", async () => {
    // Arrange
    const mockCreateSession = vi.mocked(createSessionModule.createSession);
    const mockExecuteAgent = vi.mocked(executeAgentModule.executeAgent);
    const mockFindOrCreateStep = vi.mocked(findOrCreateStepModule.findOrCreateStep);
    const mockUpdateStepStatus = vi.mocked(updateStepStatusModule.updateStepStatus);

    // Mock workflow step functions
    mockFindOrCreateStep.mockResolvedValue({
      id: "step-123",
      run_id: "run-123",
      phase: "build",
      name: "Code Review",
      type: "agent",
      status: "pending",
      input: null,
      output: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      agent_session_id: null,
      inngest_step_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockUpdateStepStatus.mockResolvedValue();

    const { user, project, run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    // Create real agent session in DB to satisfy foreign key constraint
    const realSession = await prisma.agentSession.create({
      data: {
        id: "session-123",
        cli_session_id: "session-123", // Always set now
        project: { connect: { id: project.id } },
        user: { connect: { id: user.id } },
        agent: "claude",
        name: "Agent Task",
        state: "idle",
        metadata: {},
      },
    });

    mockCreateSession.mockResolvedValue(realSession);
    mockExecuteAgent.mockResolvedValue({
      sessionId: "session-123",
      success: true,
      exitCode: 0,
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-456",
      projectPath: "/tmp/test",
      userId: "user-789",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T): T => fn()),
    };

    const agentStepFn = createAgentStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    const result = await agentStepFn("code-review", {
      agent: "claude",
      prompt: "Review this code for issues",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBe("session-123");

    expect(mockCreateSession).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project-456",
        userId: "user-789",
        sessionId: expect.any(String) as string, // sessionId (UUID)
        agent: "claude",
        name: "Code Review", // toName("code-review") -> "Code Review"
        type: "workflow",
        metadataOverride: {},
        cli_session_id: expect.any(String) as string, // Always set now
      })
    });

    expect(mockExecuteAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-123",
        agent: "claude",
        prompt: "Review this code for issues",
        workingDir: "/tmp/test",
      })
    );
  });

  it("marks session as error when agent execution fails", async () => {
    // Arrange
    const mockCreateSession = vi.mocked(createSessionModule.createSession);
    const mockExecuteAgent = vi.mocked(executeAgentModule.executeAgent);
    const mockUpdateSession = vi.mocked(updateSessionModule.updateSession);
    const mockFindOrCreateStep = vi.mocked(findOrCreateStepModule.findOrCreateStep);
    const mockUpdateStepStatus = vi.mocked(updateStepStatusModule.updateStepStatus);
    const mockHandleStepFailure = vi.mocked(handleStepFailureModule.handleStepFailure);

    // Mock workflow step functions
    mockFindOrCreateStep.mockResolvedValue({
      id: "step-123",
      run_id: "run-123",
      phase: "build",
      name: "Code Review",
      type: "agent",
      status: "pending",
      input: null,
      output: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      agent_session_id: null,
      inngest_step_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockUpdateStepStatus.mockResolvedValue();
    mockHandleStepFailure.mockResolvedValue();

    const { user, project, run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    // Create real agent session in DB to satisfy foreign key constraint
    const realSession = await prisma.agentSession.create({
      data: {
        id: "session-123",
        cli_session_id: "session-123", // Always set now
        project: { connect: { id: project.id } },
        user: { connect: { id: user.id } },
        agent: "claude",
        name: "Agent Task",
        state: "idle",
        metadata: {},
      },
    });

    mockCreateSession.mockResolvedValue(realSession);
    mockExecuteAgent.mockRejectedValue(new Error("Agent crashed"));

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-456",
      projectPath: "/tmp/test",
      userId: "user-789",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T): T => fn()),
    };

    const agentStepFn = createAgentStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act & Assert
    await expect(
      agentStepFn("code-review", {
        agent: "claude",
        prompt: "Review this code",
      })
    ).rejects.toThrow("Agent crashed");

    expect(mockUpdateSession).toHaveBeenCalledWith({
      id: "session-123",
      data: {
        state: "error",
        error_message: "Agent crashed",
      }
    });
  });

  it("uses session.id for sessionId when no resume (current behavior)", async () => {
    // Arrange
    const mockCreateSession = vi.mocked(createSessionModule.createSession);
    const mockExecuteAgent = vi.mocked(executeAgentModule.executeAgent);
    const mockFindOrCreateStep = vi.mocked(findOrCreateStepModule.findOrCreateStep);
    const mockUpdateStepStatus = vi.mocked(updateStepStatusModule.updateStepStatus);

    // Mock workflow step functions
    mockFindOrCreateStep.mockResolvedValue({
      id: "step-123",
      run_id: "run-123",
      phase: "build",
      name: "Agent Task",
      type: "agent",
      status: "pending",
      input: null,
      output: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      agent_session_id: null,
      inngest_step_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockUpdateStepStatus.mockResolvedValue();

    const { user, project, run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    // Create real agent session in DB to satisfy foreign key constraint
    const realSession = await prisma.agentSession.create({
      data: {
        id: "session-abc",
        cli_session_id: "session-abc", // Set cli_session_id (defaults to DB ID)
        project: { connect: { id: project.id } },
        user: { connect: { id: user.id } },
        agent: "claude",
        name: "Agent Task",
        state: "idle",
        metadata: {},
      },
    });

    mockCreateSession.mockResolvedValue(realSession);
    mockExecuteAgent.mockResolvedValue({
      sessionId: "claude-xyz", // CLI returns its own session ID
      success: true,
      exitCode: 0,
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-456",
      projectPath: "/tmp/test",
      userId: "user-789",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T): T => fn()),
    };

    const agentStepFn = createAgentStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    await agentStepFn("agent-task", {
      agent: "claude",
      prompt: "Do something",
      // No resume - should use session.id
    });

    // Assert: Uses processTrackingId=session.id and sessionId=cli_session_id
    expect(mockExecuteAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        processTrackingId: "session-abc", // DB session ID for tracking
        sessionId: "session-abc", // CLI session ID (defaults to DB ID when no resume)
        resume: false, // Not resuming
      })
    );
  });

  it("resumes planning session with correct IDs", async () => {
    // Arrange
    const mockCreateSession = vi.mocked(createSessionModule.createSession);
    const mockExecuteAgent = vi.mocked(executeAgentModule.executeAgent);
    const mockFindOrCreateStep = vi.mocked(findOrCreateStepModule.findOrCreateStep);
    const mockUpdateStepStatus = vi.mocked(updateStepStatusModule.updateStepStatus);

    // Mock workflow step functions
    mockFindOrCreateStep.mockResolvedValue({
      id: "step-123",
      run_id: "run-123",
      phase: "build",
      name: "Continue Planning",
      type: "agent",
      status: "pending",
      input: null,
      output: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      agent_session_id: null,
      inngest_step_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockUpdateStepStatus.mockResolvedValue();

    const { user, project, run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    // Create real agent session in DB to satisfy foreign key constraint
    const realSession = await prisma.agentSession.create({
      data: {
        id: "workflow-session",
        cli_session_id: "planning-cli-id", // Set to planning CLI ID
        project: { connect: { id: project.id } },
        user: { connect: { id: user.id } },
        agent: "claude",
        name: "Continue Planning",
        state: "idle",
        metadata: {},
      },
    });

    mockCreateSession.mockResolvedValue(realSession);
    mockExecuteAgent.mockResolvedValue({
      sessionId: "planning-cli-id", // CLI returns planning session ID
      success: true,
      exitCode: 0,
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-456",
      projectPath: "/tmp/test",
      userId: "user-789",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T): T => fn()),
    };

    const agentStepFn = createAgentStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    await agentStepFn("continue-planning", {
      agent: "claude",
      prompt: "Continue the planning",
      resume: "planning-cli-id", // Resume planning session
    });

    // Assert: Verify createSession called with planning CLI ID
    expect(mockCreateSession).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cli_session_id: "planning-cli-id", // Set to planning CLI ID
      })
    });

    // Assert: Verify executeAgent called with correct IDs
    expect(mockExecuteAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        processTrackingId: "workflow-session", // Workflow DB session ID for tracking
        sessionId: "planning-cli-id", // Planning CLI session ID for resume
        resume: true, // Resuming planning session
      })
    );
  });
});
