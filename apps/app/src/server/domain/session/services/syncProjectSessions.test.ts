import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { syncProjectSessions } from "./syncProjectSessions";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import {
  createTestUser,
  createTestProject,
  createTestSession,
} from "@/server/test-utils/fixtures";
import fs from "fs/promises";

// Mock filesystem and path utilities
vi.mock("fs/promises");
vi.mock("@/server/utils/path", () => ({
  encodeProjectPath: vi.fn((path: string) => {
    return Buffer.from(path).toString("base64url");
  }),
  getClaudeProjectsDir: vi.fn(() => "/home/user/.claude/projects"),
}));
vi.mock("./parseJSONLFile", () => ({
  parseJSONLFile: vi.fn().mockResolvedValue({
    totalTokens: 100,
    messageCount: 5,
    lastMessageAt: new Date().toISOString(),
    firstMessagePreview: "Test message",
  }),
}));

import { parseJSONLFile } from "./parseJSONLFile";

describe("syncProjectSessions", () => {
  let userId: string;
  let projectId: string;
  let projectPath: string;

  beforeEach(async () => {
    const user = await createTestUser(prisma);
    userId = user.id;

    const project = await createTestProject(prisma, {
      userId,
      name: "Test Project",
      path: "/test/project",
    });
    projectId = project.id;
    projectPath = project.path;

    // Default mock: directory exists and is accessible
    vi.mocked(fs.access).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("syncs new sessions from filesystem", async () => {
    // Mock filesystem with 2 JSONL files
    vi.mocked(fs.readdir).mockResolvedValue([
      "session-1.jsonl",
      "session-2.jsonl",
    ] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.synced).toBe(2);
    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);

    // Verify sessions created in database
    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.id)).toEqual(
      expect.arrayContaining(["session-1", "session-2"])
    );
  });

  it("skips non-jsonl files", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "session-1.jsonl",
      "readme.txt",
      "notes.md",
      "session-2.jsonl",
    ] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.synced).toBe(2);
    expect(result.created).toBe(2);

    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(2);
  });

  it("skips agent-*.jsonl files", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "session-1.jsonl",
      "agent-config.jsonl",
      "agent-state.jsonl",
      "session-2.jsonl",
    ] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.synced).toBe(2);
    expect(result.created).toBe(2);

    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions.map((s) => s.id)).toEqual(
      expect.arrayContaining(["session-1", "session-2"])
    );
    expect(sessions.map((s) => s.id)).not.toContain("agent-config");
  });

  it("does not create duplicate sessions", async () => {
    // Create existing session
    await createTestSession(prisma, {
      projectId,
      userId,
      name: "Existing Session",
    });

    const existingSessionId = (
      await prisma.agentSession.findFirst({
        where: { projectId },
      })
    )!.id;

    // Mock filesystem with existing + new sessions
    vi.mocked(fs.readdir).mockResolvedValue([
      `${existingSessionId}.jsonl`,
      "new-session.jsonl",
    ] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.synced).toBe(2);
    expect(result.created).toBe(1); // Only new session created
    expect(result.updated).toBe(0);

    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(2);
  });

  it("updates session created_at timestamp if metadata differs", async () => {
    const metadataCreatedAt = new Date("2024-01-01T00:00:00Z");

    // Create session with different created_at
    const session = await createTestSession(prisma, {
      projectId,
      userId,
      name: "Test Session",
    });

    // Mock parseJSONLFile to return metadata with different createdAt
    vi.mocked(parseJSONLFile).mockResolvedValueOnce({
      totalTokens: 100,
      messageCount: 5,
      lastMessageAt: new Date().toISOString(),
      firstMessagePreview: "Test",
      createdAt: metadataCreatedAt.toISOString(),
    });

    vi.mocked(fs.readdir).mockResolvedValue([`${session.id}.jsonl`] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.synced).toBe(1);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);

    // Verify timestamp updated
    const updated = await prisma.agentSession.findUnique({
      where: { id: session.id },
    });
    expect(updated!.created_at.toISOString()).toBe(
      metadataCreatedAt.toISOString()
    );
  });

  it("does not update timestamp if difference is less than 1 second", async () => {
    const session = await createTestSession(prisma, {
      projectId,
      userId,
    });
    const originalCreatedAt = session.created_at;

    // Mock metadata with timestamp within 1 second
    const closeTimestamp = new Date(originalCreatedAt.getTime() + 500);
    vi.mocked(parseJSONLFile).mockResolvedValueOnce({
      totalTokens: 100,
      messageCount: 5,
      lastMessageAt: new Date().toISOString(),
      firstMessagePreview: "Test",
      createdAt: closeTimestamp.toISOString(),
    });

    vi.mocked(fs.readdir).mockResolvedValue([`${session.id}.jsonl`] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.updated).toBe(0);
  });

  it("deletes orphaned Claude sessions", async () => {
    // Create session that will be orphaned (no JSONL file)
    const orphanedSession = await createTestSession(prisma, {
      projectId,
      userId,
      state: "idle",
      agent: "claude" as any,
    });

    // Set created_at to more than 5 seconds ago to pass the protection check
    await prisma.agentSession.update({
      where: { id: orphanedSession.id },
      data: { created_at: new Date(Date.now() - 10000) },
    });

    // Mock empty filesystem (no JSONL files)
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.synced).toBe(0);

    // Verify orphaned session deleted
    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(0);
  });

  it("does not delete working sessions", async () => {
    const workingSession = await createTestSession(prisma, {
      projectId,
      userId,
      state: "working",
      agent: "claude" as any,
    });

    // Set created_at to old to pass time check
    await prisma.agentSession.update({
      where: { id: workingSession.id },
      data: { created_at: new Date(Date.now() - 10000) },
    });

    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    await syncProjectSessions({
      projectId,
      userId,
    });

    // Verify working session NOT deleted
    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].state).toBe("working");
  });

  it("does not delete recently created sessions (race condition protection)", async () => {
    const recentSession = await createTestSession(prisma, {
      projectId,
      userId,
      state: "idle",
      agent: "claude" as any,
    });

    // created_at is very recent (default from createTestSession)
    // This simulates a session being created right before sync

    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    await syncProjectSessions({
      projectId,
      userId,
    });

    // Verify recent session NOT deleted (race condition protection)
    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(1);
  });

  it("handles missing directory gracefully", async () => {
    // Mock directory not found
    const error: NodeJS.ErrnoException = new Error("ENOENT") as any;
    error.code = "ENOENT";
    vi.mocked(fs.access).mockRejectedValue(error);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.synced).toBe(0);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
  });

  it("throws error for non-ENOENT filesystem errors", async () => {
    // Mock permission denied error
    const error: NodeJS.ErrnoException = new Error("EACCES") as any;
    error.code = "EACCES";
    vi.mocked(fs.access).mockRejectedValue(error);

    await expect(
      syncProjectSessions({
        projectId,
        userId,
      })
    ).rejects.toThrow("EACCES");
  });

  it("handles corrupt JSONL files gracefully", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "good-session.jsonl",
      "corrupt-session.jsonl",
    ] as any);

    // Mock parseJSONLFile to succeed for first, fail for second
    vi.mocked(parseJSONLFile)
      .mockResolvedValueOnce({
        totalTokens: 100,
        messageCount: 5,
        lastMessageAt: new Date().toISOString(),
        firstMessagePreview: "Good",
      })
      .mockRejectedValueOnce(new Error("Parse error"));

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    // Only good session synced
    expect(result.synced).toBe(1);
    expect(result.created).toBe(1);

    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe("good-session");
  });

  it("throws error for non-existent project", async () => {
    const invalidProjectId = "invalid-project-id";

    await expect(
      syncProjectSessions({
        projectId: invalidProjectId,
        userId,
      })
    ).rejects.toThrow(`Project not found: ${invalidProjectId}`);
  });

  it("only syncs Claude sessions", async () => {
    // Create non-Claude sessions
    await createTestSession(prisma, {
      projectId,
      userId,
      agent: "codex" as any,
    });

    vi.mocked(fs.readdir).mockResolvedValue(["claude-session.jsonl"] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    expect(result.created).toBe(1);

    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });

    // Should have both codex (untouched) and new claude session
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.agent)).toEqual(
      expect.arrayContaining(["codex", "claude"])
    );
  });

  it("avoids unique constraint violations with other agent types", async () => {
    // Create session with ID that will be in filesystem
    await createTestSession(prisma, {
      projectId,
      userId,
      agent: "codex" as any,
    });

    const codexSessionId = (
      await prisma.agentSession.findFirst({
        where: { agent: "codex" },
      })
    )!.id;

    // Mock filesystem with same session ID
    vi.mocked(fs.readdir).mockResolvedValue([
      `${codexSessionId}.jsonl`,
    ] as any);

    const result = await syncProjectSessions({
      projectId,
      userId,
    });

    // Should skip creating duplicate
    expect(result.created).toBe(0);

    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(1); // Only original codex session
  });

  it("handles concurrent sync operations", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "session-1.jsonl",
      "session-2.jsonl",
    ] as any);

    // Run 3 concurrent syncs
    const syncPromises = Array.from({ length: 3 }, () =>
      syncProjectSessions({ projectId, userId })
    );

    const results = await Promise.all(syncPromises);

    // First sync creates, others find existing
    expect(results.some((r) => r.created > 0)).toBe(true);

    // Verify no duplicates created
    const sessions = await prisma.agentSession.findMany({
      where: { projectId },
    });
    expect(sessions).toHaveLength(2);
  });

  it("sets correct metadata from parsed JSONL", async () => {
    const customMetadata = {
      totalTokens: 5000,
      messageCount: 42,
      lastMessageAt: "2024-01-15T10:30:00Z",
      firstMessagePreview: "Custom preview text",
      createdAt: "2024-01-01T00:00:00Z",
    };

    vi.mocked(parseJSONLFile).mockResolvedValue(customMetadata);
    vi.mocked(fs.readdir).mockResolvedValue(["test-session.jsonl"] as any);

    await syncProjectSessions({
      projectId,
      userId,
    });

    const session = await prisma.agentSession.findFirst({
      where: { id: "test-session" },
    });

    expect(session).toBeTruthy();
    expect(session!.metadata).toMatchObject({
      totalTokens: 5000,
      messageCount: 42,
      lastMessageAt: "2024-01-15T10:30:00Z",
      firstMessagePreview: "Custom preview text",
    });
  });
});
