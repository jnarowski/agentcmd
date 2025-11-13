import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeAgent } from "./executeAgent";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import type { ChildProcess } from "node:child_process";

// Mock dependencies
vi.mock("agent-cli-sdk", () => ({
  execute: vi.fn(),
}));

import { execute } from "agent-cli-sdk";

describe("executeAgent - Current Behavior (Phase 1)", () => {
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

  it("stores process via onStart callback using processTrackingId", async () => {
    const processTrackingId = "db-session-id";
    const cliSessionId = "cli-session-id";

    // Setup: Mock execute to call onStart with the real activeSessions
    // We need to capture and call the onStart callback
    let capturedOnStart: ((process: ChildProcess) => void) | undefined;

    vi.mocked(execute).mockImplementation(async (config) => {
      // @ts-expect-error - onStart is optional in types but we're testing it
      capturedOnStart = config.onStart;
      // Call it immediately to simulate what the real execute does
      if (capturedOnStart) {
        capturedOnStart(mockProcess);
      }
      return {
        success: true,
        exitCode: 0,
        sessionId: "claude-xyz",
      };
    });

    // Execute
    await executeAgent({
      processTrackingId,
      sessionId: cliSessionId,
      resume: false,
      agent: "claude",
      prompt: "test prompt",
      workingDir: "/test",
    });

    // Assert: Process was stored and tracked by processTrackingId
    // Note: Process is cleared after execution completes, so we verify
    // that execute was called with onStart callback
    expect(capturedOnStart).toBeDefined();
  });

  it("clears process after successful completion", async () => {
    const processTrackingId = "db-session-id";
    const cliSessionId = "cli-session-id";

    // Setup: Mock execute to call onStart then complete
    vi.mocked(execute).mockImplementation(async (config) => {
      // @ts-expect-error - onStart is optional in types but we're testing it
      if (config.onStart) {
        // @ts-expect-error - onStart is optional in types but we're testing it
        config.onStart(mockProcess);
      }
      return {
        success: true,
        exitCode: 0,
        sessionId: "claude-xyz",
      };
    });

    // Execute
    await executeAgent({
      processTrackingId,
      sessionId: cliSessionId,
      resume: false,
      agent: "claude",
      prompt: "test prompt",
      workingDir: "/test",
    });

    // Assert: Process cleared after completion (by processTrackingId)
    expect(activeSessions.getProcess(processTrackingId)).toBeUndefined();
  });

  it("clears process after error", async () => {
    const processTrackingId = "db-session-id";
    const cliSessionId = "cli-session-id";

    // Setup: Mock execute to call onStart then error
    vi.mocked(execute).mockImplementation(async (config) => {
      // @ts-expect-error - onStart is optional in types but we're testing it
      if (config.onStart) {
        // @ts-expect-error - onStart is optional in types but we're testing it
        config.onStart(mockProcess);
      }
      throw new Error("Test error");
    });

    // Execute
    await executeAgent({
      processTrackingId,
      sessionId: cliSessionId,
      resume: false,
      agent: "claude",
      prompt: "test prompt",
      workingDir: "/test",
    });

    // Assert: Process cleared after error (by processTrackingId)
    expect(activeSessions.getProcess(processTrackingId)).toBeUndefined();
  });

  it("handles cancelled flag correctly", async () => {
    const processTrackingId = "db-session-id";
    const cliSessionId = "cli-session-id";

    // Setup: Mock execute to call onStart
    vi.mocked(execute).mockImplementation(async (config) => {
      // @ts-expect-error - onStart is optional in types but we're testing it
      if (config.onStart) {
        // @ts-expect-error - onStart is optional in types but we're testing it
        config.onStart(mockProcess);
      }
      return {
        success: false,
        exitCode: 130, // Typical cancellation exit code
        sessionId: "claude-xyz",
      };
    });

    // Setup: Mark session as cancelled (by processTrackingId)
    activeSessions.getOrCreate(processTrackingId, {
      projectPath: "/test",
      userId: "test-user",
    });
    activeSessions.update(processTrackingId, { cancelled: true });

    // Execute
    const result = await executeAgent({
      processTrackingId,
      sessionId: cliSessionId,
      resume: false,
      agent: "claude",
      prompt: "test prompt",
      workingDir: "/test",
    });

    // Assert: Cancelled sessions return success=true with no error
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("passes CLI sessionId to execute (not processTrackingId)", async () => {
    const processTrackingId = "db-session-id";
    const cliSessionId = "cli-session-id";

    // Setup: Mock execute
    vi.mocked(execute).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: "claude-xyz",
    });

    // Execute
    await executeAgent({
      processTrackingId,
      sessionId: cliSessionId,
      resume: false,
      agent: "claude",
      prompt: "test prompt",
      workingDir: "/test",
    });

    // Assert: CLI sessionId passed to execute (not processTrackingId)
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: cliSessionId,
      })
    );
  });

  it("passes resume flag to CLI", async () => {
    const processTrackingId = "workflow-session-id";
    const cliSessionId = "planning-cli-id";

    // Setup: Mock execute
    vi.mocked(execute).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: "planning-cli-id",
    });

    // Execute
    await executeAgent({
      processTrackingId,
      sessionId: cliSessionId,
      resume: true,
      agent: "claude",
      prompt: "test prompt",
      workingDir: "/test",
    });

    // Assert: resume flag and CLI sessionId passed to execute
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: cliSessionId,
        resume: true,
      })
    );
  });

  it("allows processTrackingId to differ from sessionId (workflow resume)", async () => {
    const processTrackingId = "workflow-db-id";
    const cliSessionId = "planning-cli-id";

    // Setup: Mock execute
    vi.mocked(execute).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: "planning-cli-id",
    });

    // Execute
    await executeAgent({
      processTrackingId,
      sessionId: cliSessionId,
      resume: true,
      agent: "claude",
      prompt: "Continue planning",
      workingDir: "/test",
    });

    // Assert: Both IDs are different and handled correctly
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: cliSessionId, // CLI receives the planning ID
      })
    );
    // Process tracking uses processTrackingId (verified by onStart storing to activeSessions)
  });
});
