import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { getSessionMessages } from "./getSessionMessages";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import {
  createTestUser,
  createTestProject,
  createTestSession,
} from "@/server/test-utils/fixtures";
import type { UnifiedMessage } from "agent-cli-sdk";

// Mock agent-cli-sdk
vi.mock("agent-cli-sdk", () => ({
  loadMessages: vi.fn(),
}));

import { loadMessages } from "agent-cli-sdk";

describe("getSessionMessages", () => {
  let userId: string;
  let otherUserId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await createTestUser(prisma);
    userId = user.id;

    const otherUser = await createTestUser(prisma, {
      username: "otheruser",
      email: "other@example.com",
    });
    otherUserId = otherUser.id;

    const project = await createTestProject(prisma, {
      userId,
      name: "Test Project",
      path: "/test/project",
    });
    projectId = project.id;
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("loads messages for valid session", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
      name: "Test Session",
    });

    const mockMessages: UnifiedMessage[] = [
      {
        id: "msg-1",
        type: "user",
        text: "Hello",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-2",
        type: "assistant",
        text: "Hi there!",
        timestamp: new Date().toISOString(),
      },
    ];

    vi.mocked(loadMessages).mockResolvedValue(mockMessages);

    const messages = await getSessionMessages({
      sessionId: session.id,
      userId,
    });

    expect(messages).toEqual(mockMessages);
    expect(loadMessages).toHaveBeenCalledWith({
      tool: session.agent,
      sessionId: session.cli_session_id ?? session.id,
      sessionPath: session.session_path ?? undefined,
    });
  });

  it("uses cli_session_id when available", async () => {
    const cliSessionId = "cli-session-123";
    const session = await createTestSession(prisma, {
      projectId,
      userId,
      cli_session_id: cliSessionId,
    });

    vi.mocked(loadMessages).mockResolvedValue([]);

    await getSessionMessages({
      sessionId: session.id,
      userId,
    });

    expect(loadMessages).toHaveBeenCalledWith({
      tool: session.agent,
      sessionId: cliSessionId,
      sessionPath: session.session_path ?? undefined,
    });
  });

  it("falls back to session id when cli_session_id is null", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
      cli_session_id: null,
    });

    vi.mocked(loadMessages).mockResolvedValue([]);

    await getSessionMessages({
      sessionId: session.id,
      userId,
    });

    expect(loadMessages).toHaveBeenCalledWith({
      tool: session.agent,
      sessionId: session.id,
      sessionPath: session.session_path ?? undefined,
    });
  });

  it("returns empty array for session with no messages", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });

    vi.mocked(loadMessages).mockResolvedValue([]);

    const messages = await getSessionMessages({
      sessionId: session.id,
      userId,
    });

    expect(messages).toEqual([]);
  });

  it("returns messages in order", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });

    const mockMessages: UnifiedMessage[] = [
      {
        id: "msg-1",
        type: "user",
        text: "First",
        timestamp: "2024-01-01T00:00:00Z",
      },
      {
        id: "msg-2",
        type: "assistant",
        text: "Second",
        timestamp: "2024-01-01T00:00:01Z",
      },
      {
        id: "msg-3",
        type: "user",
        text: "Third",
        timestamp: "2024-01-01T00:00:02Z",
      },
    ];

    vi.mocked(loadMessages).mockResolvedValue(mockMessages);

    const messages = await getSessionMessages({
      sessionId: session.id,
      userId,
    });

    expect(messages).toHaveLength(3);
    expect(messages[0].text).toBe("First");
    expect(messages[1].text).toBe("Second");
    expect(messages[2].text).toBe("Third");
  });

  it("throws error for non-existent session", async () => {
    const invalidSessionId = "invalid-session-id";

    await expect(
      getSessionMessages({
        sessionId: invalidSessionId,
        userId,
      })
    ).rejects.toThrow(`Session not found: ${invalidSessionId}`);

    expect(loadMessages).not.toHaveBeenCalled();
  });

  it("throws error for unauthorized access", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });

    await expect(
      getSessionMessages({
        sessionId: session.id,
        userId: otherUserId,
      })
    ).rejects.toThrow("Unauthorized access to session");

    expect(loadMessages).not.toHaveBeenCalled();
  });

  it("handles different agent types", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
      agent: "codex",
    });

    vi.mocked(loadMessages).mockResolvedValue([]);

    await getSessionMessages({
      sessionId: session.id,
      userId,
    });

    expect(loadMessages).toHaveBeenCalledWith({
      tool: "codex",
      sessionId: session.cli_session_id ?? session.id,
      sessionPath: session.session_path ?? undefined,
    });
  });

  it("handles SDK errors gracefully", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });

    const sdkError = new Error("Failed to read JSONL file");
    vi.mocked(loadMessages).mockRejectedValue(sdkError);

    await expect(
      getSessionMessages({
        sessionId: session.id,
        userId,
      })
    ).rejects.toThrow("Failed to read JSONL file");
  });

  it("handles corrupt JSONL data", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });

    const parseError = new Error("Invalid JSON in line 5");
    vi.mocked(loadMessages).mockRejectedValue(parseError);

    await expect(
      getSessionMessages({
        sessionId: session.id,
        userId,
      })
    ).rejects.toThrow("Invalid JSON in line 5");
  });

  it("handles missing file", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });

    const fileError = new Error("ENOENT: no such file or directory");
    vi.mocked(loadMessages).mockRejectedValue(fileError);

    await expect(
      getSessionMessages({
        sessionId: session.id,
        userId,
      })
    ).rejects.toThrow("ENOENT: no such file or directory");
  });

  it("loads messages with all message types", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });

    const mockMessages: UnifiedMessage[] = [
      {
        id: "msg-1",
        type: "user",
        text: "User message",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-2",
        type: "assistant",
        text: "Assistant message",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-3",
        type: "system",
        text: "System message",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-4",
        type: "tool_use",
        text: "Tool use",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-5",
        type: "tool_result",
        text: "Tool result",
        timestamp: new Date().toISOString(),
      },
    ];

    vi.mocked(loadMessages).mockResolvedValue(mockMessages);

    const messages = await getSessionMessages({
      sessionId: session.id,
      userId,
    });

    expect(messages).toHaveLength(5);
    expect(messages.map((m) => m.type)).toEqual([
      "user",
      "assistant",
      "system",
      "tool_use",
      "tool_result",
    ]);
  });

  it("includes project in session query", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });

    vi.mocked(loadMessages).mockResolvedValue([]);

    await getSessionMessages({
      sessionId: session.id,
      userId,
    });

    // Verify sessionPath was used in loadMessages call (replaces old projectPath)
    expect(loadMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionPath: undefined, // Default session has no session_path
      })
    );
  });
});
