import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cancelSession } from "./cancelSession";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import { prisma } from "@/shared/prisma";
import type { ChildProcess } from "node:child_process";

// Mock dependencies
vi.mock("@/shared/prisma", () => ({
  prisma: {
    agentSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("agent-cli-sdk", () => ({
  killProcess: vi.fn(),
}));

vi.mock("./updateSessionState", () => ({
  updateSessionState: vi.fn(),
}));

vi.mock("@/server/websocket/infrastructure/subscriptions", () => ({
  broadcast: vi.fn(),
}));

describe("cancelSession - Current Behavior (Phase 1)", () => {
  const mockProcess = {
    pid: 12345,
    kill: vi.fn(),
  } as unknown as ChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up active sessions individually (no clearAll method)
    // Tests clean up their own sessions via the test logic
  });

  it("finds and kills process by sessionId", async () => {
    const sessionId = "test-session-id";
    const userId = "test-user-id";

    // Setup: Mock session in database
    vi.mocked(prisma.agentSession.findUnique).mockResolvedValue({
      id: sessionId,
      user_id: userId,
      project_id: "test-project",
      agent: "claude",
      type: "chat",
      state: "working",
      name: null,
      cli_session_id: null,
      error_message: null,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      is_archived: false,
      archived_at: null,
      name_generated_at: null,
      permission_mode: "default",
      session_path: null,
    });

    // Setup: Store process in activeSessions by sessionId
    activeSessions.setProcess(sessionId, mockProcess);

    // Execute
    const result = await cancelSession({ sessionId, userId });

    // Assert
    expect(result.success).toBe(true);
    expect(activeSessions.getProcess(sessionId)).toBeUndefined();
  });

  it("returns error when session not found", async () => {
    const sessionId = "non-existent";
    const userId = "test-user-id";

    // Setup: Mock session not found
    vi.mocked(prisma.agentSession.findUnique).mockResolvedValue(null);

    // Execute
    const result = await cancelSession({ sessionId, userId });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Session not found");
  });

  it("returns error when user does not own session", async () => {
    const sessionId = "test-session-id";
    const userId = "test-user-id";
    const differentUserId = "different-user-id";

    // Setup: Mock session owned by different user
    vi.mocked(prisma.agentSession.findUnique).mockResolvedValue({
      id: sessionId,
      user_id: differentUserId,
      project_id: "test-project",
      agent: "claude",
      type: "chat",
      state: "working",
      name: null,
      cli_session_id: null,
      error_message: null,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      is_archived: false,
      archived_at: null,
      name_generated_at: null,
      permission_mode: "default",
      session_path: null,
    });

    // Execute
    const result = await cancelSession({ sessionId, userId });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized: session does not belong to user");
  });

  it("returns error when session not in working state", async () => {
    const sessionId = "test-session-id";
    const userId = "test-user-id";

    // Setup: Mock session in idle state
    vi.mocked(prisma.agentSession.findUnique).mockResolvedValue({
      id: sessionId,
      user_id: userId,
      project_id: "test-project",
      agent: "claude",
      type: "chat",
      state: "idle",
      name: null,
      cli_session_id: null,
      error_message: null,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      is_archived: false,
      archived_at: null,
      name_generated_at: null,
      permission_mode: "default",
      session_path: null,
    });

    // Execute
    const result = await cancelSession({ sessionId, userId });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot cancel session in 'idle' state");
  });

  it("handles missing process gracefully (race condition)", async () => {
    const sessionId = "test-session-id";
    const userId = "test-user-id";

    // Setup: Mock session in working state
    vi.mocked(prisma.agentSession.findUnique).mockResolvedValue({
      id: sessionId,
      user_id: userId,
      project_id: "test-project",
      agent: "claude",
      type: "chat",
      state: "working",
      name: null,
      cli_session_id: null,
      error_message: null,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      is_archived: false,
      archived_at: null,
      name_generated_at: null,
      permission_mode: "default",
      session_path: null,
    });

    // Setup: No process in activeSessions (race condition)
    // Don't set process

    // Execute
    const result = await cancelSession({ sessionId, userId });

    // Assert: Should succeed gracefully
    expect(result.success).toBe(true);
  });
});
