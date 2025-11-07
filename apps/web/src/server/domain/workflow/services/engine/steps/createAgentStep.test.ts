import { describe, it, expect, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import type { AgentSession } from "@prisma/client";
import { cleanTestDB } from "@/server/test-utils/db";
import { createAgentStep } from "./createAgentStep";
import type { RuntimeContext } from "../../../types/engine.types";
import * as executeAgentModule from "@/server/domain/session/services/executeAgent";
import * as createSessionModule from "@/server/domain/session/services/createSession";
import * as updateSessionModule from "@/server/domain/session/services/updateSession";

vi.mock("@/server/domain/session/services/executeAgent");
vi.mock("@/server/domain/session/services/createSession");
vi.mock("@/server/domain/session/services/updateSession");

describe("createAgentStep", () => {
  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("creates session and executes agent with correct args", async () => {
    // Arrange
    const mockCreateSession = vi.mocked(createSessionModule.createSession);
    const mockExecuteAgent = vi.mocked(executeAgentModule.executeAgent);

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

    // Create real agent session in DB to satisfy foreign key constraint
    const realSession = await prisma.agentSession.create({
      data: {
        id: "session-123",
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
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
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
      data: {
        projectId: "project-456",
        userId: "user-789",
        sessionId: expect.any(String), // sessionId (UUID)
        agent: "claude",
        name: "Code Review", // toName("code-review") -> "Code Review"
        metadataOverride: {}
      }
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

    mockCreateSession.mockResolvedValue({
      id: "session-123",
      projectId: "project-456",
      userId: "user-789",
      agent: "claude",
      name: "Agent Task",
      state: "active",
      cli_session_id: null,
      session_path: null,
      metadata: {},
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies AgentSession);

    mockExecuteAgent.mockRejectedValue(new Error("Agent crashed"));

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
      projectId: "project-456",
      projectPath: "/tmp/test",
      userId: "user-789",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
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
});
