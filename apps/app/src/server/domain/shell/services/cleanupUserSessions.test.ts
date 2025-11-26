import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanupUserSessions } from "./cleanupUserSessions";
import { setShellSession, getUserSessions } from "./getShellSession";
import { createMockPty } from "@/server/test-utils/shell";
import type { ShellSession } from "../types";

// Mock destroyShellSession
vi.mock("./destroyShellSession", () => ({
  destroyShellSession: vi.fn(),
}));

import { destroyShellSession } from "./destroyShellSession";

describe("cleanupUserSessions", () => {
  const userId1 = "user-123";
  const userId2 = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("cleans up all sessions for a user", () => {
    // Setup multiple sessions for user1
    const session1: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-1",
      userId: userId1,
      createdAt: new Date(),
    };
    const session2: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-2",
      userId: userId1,
      createdAt: new Date(),
    };

    setShellSession("session-1", session1);
    setShellSession("session-2", session2);

    cleanupUserSessions({ userId: userId1 });

    // Verify destroyShellSession called for each session
    expect(destroyShellSession).toHaveBeenCalledTimes(2);
    expect(destroyShellSession).toHaveBeenCalledWith({ sessionId: "session-1" });
    expect(destroyShellSession).toHaveBeenCalledWith({ sessionId: "session-2" });
  });

  it("only cleans up sessions for specified user", () => {
    // Setup sessions for multiple users
    const session1: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-1",
      userId: userId1,
      createdAt: new Date(),
    };
    const session2: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-2",
      userId: userId2,
      createdAt: new Date(),
    };

    setShellSession("session-1", session1);
    setShellSession("session-2", session2);

    cleanupUserSessions({ userId: userId1 });

    // Verify only user1's session was destroyed
    expect(destroyShellSession).toHaveBeenCalledTimes(1);
    expect(destroyShellSession).toHaveBeenCalledWith({ sessionId: "session-1" });
    expect(destroyShellSession).not.toHaveBeenCalledWith({ sessionId: "session-2" });
  });

  it("handles user with no sessions", () => {
    // Setup sessions for different user
    const session: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-1",
      userId: userId2,
      createdAt: new Date(),
    };
    setShellSession("session-1", session);

    // Cleanup for user with no sessions
    cleanupUserSessions({ userId: userId1 });

    // No sessions should be destroyed
    expect(destroyShellSession).not.toHaveBeenCalled();
  });

  it("handles cleanup errors gracefully", () => {
    // Setup sessions
    const session1: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-1",
      userId: userId1,
      createdAt: new Date(),
    };
    const session2: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-2",
      userId: userId1,
      createdAt: new Date(),
    };

    setShellSession("session-1", session1);
    setShellSession("session-2", session2);

    // Mock first destroy to throw error
    vi.mocked(destroyShellSession).mockImplementationOnce(() => {
      throw new Error("Cleanup failed");
    });

    // Should throw error from first failed cleanup
    expect(() => {
      cleanupUserSessions({ userId: userId1 });
    }).toThrow("Cleanup failed");

    // First session cleanup was attempted
    expect(destroyShellSession).toHaveBeenCalledWith({ sessionId: "session-1" });
    // Second session cleanup was not attempted (error stopped loop)
    expect(destroyShellSession).toHaveBeenCalledTimes(1);
  });

  it("cleans up sessions in order", () => {
    // Setup multiple sessions
    const sessions = ["session-1", "session-2", "session-3"];
    sessions.forEach((sessionId) => {
      const session: ShellSession = {
        ptyProcess: createMockPty(),
        projectId: "project-1",
        userId: userId1,
        createdAt: new Date(),
      };
      setShellSession(sessionId, session);
    });

    cleanupUserSessions({ userId: userId1 });

    // All sessions should be cleaned up
    expect(destroyShellSession).toHaveBeenCalledTimes(3);

    // Verify each session was destroyed
    sessions.forEach((sessionId) => {
      expect(destroyShellSession).toHaveBeenCalledWith({ sessionId });
    });
  });

  it("handles empty user ID", () => {
    // Setup session
    const session: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-1",
      userId: userId1,
      createdAt: new Date(),
    };
    setShellSession("session-1", session);

    // Cleanup with empty user ID
    cleanupUserSessions({ userId: "" });

    // No sessions should match
    expect(destroyShellSession).not.toHaveBeenCalled();
  });

  it("verifies getUserSessions returns correct sessions", () => {
    // Setup sessions for multiple users
    const session1: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-1",
      userId: userId1,
      createdAt: new Date(),
    };
    const session2: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-2",
      userId: userId1,
      createdAt: new Date(),
    };
    const session3: ShellSession = {
      ptyProcess: createMockPty(),
      projectId: "project-3",
      userId: userId2,
      createdAt: new Date(),
    };

    setShellSession("session-1", session1);
    setShellSession("session-2", session2);
    setShellSession("session-3", session3);

    const user1Sessions = getUserSessions({ userId: userId1 });
    expect(user1Sessions).toHaveLength(2);
    expect(user1Sessions).toContain("session-1");
    expect(user1Sessions).toContain("session-2");
    expect(user1Sessions).not.toContain("session-3");
  });
});
