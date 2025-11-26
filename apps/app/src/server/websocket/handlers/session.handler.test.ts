import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSessionSendMessage } from "./session.handler";
import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

// Mock dependencies
vi.mock("@/shared/prisma", () => ({
  prisma: {
    agentSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("./executeAgent", () => ({
  executeAgent: vi.fn(),
}));

vi.mock("@/server/domain/session/services", () => ({
  validateSessionOwnership: vi.fn(),
  executeAgent: vi.fn(),
  processImageUploads: vi.fn().mockResolvedValue({ imagePaths: [] }),
  validateAgentSupported: vi.fn().mockResolvedValue({ supported: true }),
  parseExecutionConfig: vi.fn().mockResolvedValue({ resume: false }),
  updateSessionState: vi.fn(),
  handleExecutionFailure: vi.fn(),
  cleanupSessionImages: vi.fn(),
  storeCliSessionId: vi.fn(),
  generateSessionName: vi.fn(),
  extractUsageFromEvents: vi.fn(),
}));

vi.mock("@/server/websocket/infrastructure/subscriptions", () => ({
  subscribe: vi.fn(),
  broadcast: vi.fn(),
}));

vi.mock("@/server/websocket/infrastructure/active-sessions", () => ({
  activeSessions: {
    getOrCreate: vi.fn().mockReturnValue({
      projectPath: "/test/path",
      userId: "test-user",
    }),
  },
}));

import { executeAgent } from "@/server/domain/session/services";
import { validateSessionOwnership } from "@/server/domain/session/services";

describe("session.handler - Current Behavior (Phase 1)", () => {
  const mockSocket = {
    readyState: 1,
    send: vi.fn(),
  } as unknown as WebSocket;

  const mockFastify = {
    log: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses sessionId for both IDs when cli_session_id equals sessionId", async () => {
    const sessionId = "test-session-id";
    const userId = "test-user-id";

    // Setup: Mock session with cli_session_id = sessionId (new session)
    vi.mocked(validateSessionOwnership).mockResolvedValue({
      id: sessionId,
      userId,
      projectId: "test-project",
      agent: "claude",
      type: "chat",
      state: "idle",
      name: null,
      cli_session_id: sessionId, // Now always set (defaults to DB ID)
      error_message: null,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      project: {
        id: "test-project",
        name: "Test Project",
        path: "/test/path",
        userId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    vi.mocked(executeAgent).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: "claude-abc",
    });

    // Execute
    await handleSessionSendMessage(
      mockSocket,
      sessionId,
      { message: "Hello" },
      userId,
      mockFastify
    );

    // Assert: Uses sessionId for both processTrackingId and sessionId
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        processTrackingId: sessionId, // DB session ID for tracking
        sessionId, // CLI session ID (same as DB ID)
      })
    );
  });

  it("uses cli_session_id for sessionId parameter (continuation)", async () => {
    const sessionId = "test-session-id";
    const cliSessionId = "claude-abc";
    const userId = "test-user-id";

    // Setup: Mock session with cli_session_id (continuation)
    vi.mocked(validateSessionOwnership).mockResolvedValue({
      id: sessionId,
      userId,
      projectId: "test-project",
      agent: "claude",
      type: "chat",
      state: "idle",
      name: null,
      cli_session_id: cliSessionId, // CLI session ID from first message
      error_message: null,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      project: {
        id: "test-project",
        name: "Test Project",
        path: "/test/path",
        userId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    vi.mocked(executeAgent).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: cliSessionId,
    });

    // Execute
    await handleSessionSendMessage(
      mockSocket,
      sessionId,
      { message: "Hello again" },
      userId,
      mockFastify
    );

    // Assert: Uses processTrackingId=sessionId, sessionId=cli_session_id
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        processTrackingId: sessionId, // DB session ID for tracking
        sessionId: cliSessionId, // CLI session ID for continuation
      })
    );
  });

  it("passes resume flag to executeAgent", async () => {
    const sessionId = "test-session-id";
    const userId = "test-user-id";

    // Setup: Mock session
    vi.mocked(validateSessionOwnership).mockResolvedValue({
      id: sessionId,
      userId,
      projectId: "test-project",
      agent: "claude",
      type: "chat",
      state: "idle",
      name: null,
      cli_session_id: "claude-abc",
      error_message: null,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      project: {
        id: "test-project",
        name: "Test Project",
        path: "/test/path",
        userId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    vi.mocked(executeAgent).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: "claude-abc",
    });

    // Mock parseExecutionConfig to return resume=true
    const { parseExecutionConfig } = await import(
      "@/server/domain/session/services"
    );
    vi.mocked(parseExecutionConfig).mockResolvedValue({
      resume: true,
      permissionMode: undefined,
      model: undefined,
    });

    // Execute
    await handleSessionSendMessage(
      mockSocket,
      sessionId,
      { message: "Continue", config: { resume: true } },
      userId,
      mockFastify
    );

    // Assert: resume flag and correct IDs passed to executeAgent
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        processTrackingId: sessionId, // DB session ID for tracking
        sessionId: "claude-abc", // CLI session ID for continuation
        resume: true,
      })
    );
  });
});
