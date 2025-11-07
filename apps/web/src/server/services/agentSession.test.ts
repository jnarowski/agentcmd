/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { parseJSONLFile } from "@/server/domain/session/services/parseJSONLFile";
import { syncProjectSessions } from "@/server/domain/session/services/syncProjectSessions";
import { getSessionFilePath } from "@/server/utils/path";
import { prisma } from "@/shared/prisma";

// Mock Prisma - factory function to avoid hoisting issues
vi.mock("@/shared/prisma", () => {
  const mockPrisma = {
    project: {
      findUnique: vi.fn(),
    },
    agentSession: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  };

  // Make $transaction call the callback with mockPrisma
  mockPrisma.$transaction.mockImplementation(async (callback) => {
    if (typeof callback === "function") {
      return await callback(mockPrisma);
    }
    return Promise.resolve();
  });

  return { prisma: mockPrisma };
});

describe("AgentSessionService", () => {
  const testDir = path.join(os.tmpdir(), "claude-test-sessions");
  const originalHome = process.env.HOME;
  const testUserId = "test-user-id";
  const testProjectId = "test-project-id";

  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks();

    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    // Override home directory for tests
    process.env.HOME = os.tmpdir();
    await fs.mkdir(path.join(os.tmpdir(), ".claude", "projects"), {
      recursive: true,
    });
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
    try {
      await fs.rm(path.join(os.tmpdir(), ".claude"), {
        recursive: true,
        force: true,
        maxRetries: 3,
      });
    } catch (e) {
      // Ignore cleanup errors
    }
    process.env.HOME = originalHome;
  });

  describe("parseJSONLFile", () => {
    it("should parse a valid JSONL file with user and assistant messages", async () => {
      const sessionFile = path.join(testDir, "test-session.jsonl");
      const messages = [
        JSON.stringify({
          type: "user",
          message: { content: "Hello Claude" },
          timestamp: "2025-01-01T10:00:00Z",
        }),
        JSON.stringify({
          type: "assistant",
          message: { content: "Hello! How can I help?" },
          timestamp: "2025-01-01T10:00:05Z",
          usage: {
            input_tokens: 10,
            output_tokens: 15,
            cache_creation_input_tokens: 5,
            cache_read_input_tokens: 3,
          },
        }),
        JSON.stringify({
          type: "user",
          message: { content: "Tell me a joke" },
          timestamp: "2025-01-01T10:00:10Z",
        }),
      ];
      await fs.writeFile(sessionFile, messages.join("\n"));

      const metadata = await parseJSONLFile({ filePath: sessionFile });

      expect(metadata.messageCount).toBe(3);
      expect(metadata.totalTokens).toBe(33); // 10 + 15 + 5 + 3
      expect(metadata.firstMessagePreview).toBe("Hello Claude");
      expect(metadata.lastMessageAt).toBe("2025-01-01T10:00:10Z");
    });

    it("should handle messages with array content", async () => {
      const sessionFile = path.join(testDir, "array-content.jsonl");
      const messages = [
        JSON.stringify({
          type: "user",
          message: {
            content: [
              { type: "text", text: "First part" },
              { type: "text", text: "Second part" },
            ],
          },
          timestamp: "2025-01-01T10:00:00Z",
        }),
      ];
      await fs.writeFile(sessionFile, messages.join("\n"));

      const metadata = await parseJSONLFile({ filePath: sessionFile });

      expect(metadata.messageCount).toBe(1);
      expect(metadata.firstMessagePreview).toBe("First part Second part");
    });

    it("should ignore non-message entries", async () => {
      const sessionFile = path.join(testDir, "mixed-entries.jsonl");
      const entries = [
        JSON.stringify({ type: "summary", summary: "Test summary" }),
        JSON.stringify({ type: "user", message: { content: "Message 1" } }),
        JSON.stringify({ type: "file-history-snapshot", data: {} }),
        JSON.stringify({ type: "assistant", message: { content: "Response" } }),
        JSON.stringify({ type: "create", data: {} }),
      ];
      await fs.writeFile(sessionFile, entries.join("\n"));

      const metadata = await parseJSONLFile({ filePath: sessionFile });

      expect(metadata.messageCount).toBe(2); // Only user and assistant messages
    });

    it("should handle malformed JSON lines gracefully", async () => {
      const sessionFile = path.join(testDir, "malformed.jsonl");
      const lines = [
        JSON.stringify({ type: "user", message: { content: "Valid message" } }),
        "this is not valid json",
        JSON.stringify({ type: "assistant", message: { content: "Response" } }),
        "{incomplete",
      ];
      await fs.writeFile(sessionFile, lines.join("\n"));

      const metadata = await parseJSONLFile({ filePath: sessionFile });

      expect(metadata.messageCount).toBe(2); // Should count only valid messages
    });

    it("should handle empty files", async () => {
      const sessionFile = path.join(testDir, "empty.jsonl");
      await fs.writeFile(sessionFile, "");

      const metadata = await parseJSONLFile({ filePath: sessionFile });

      expect(metadata.messageCount).toBe(0);
      expect(metadata.totalTokens).toBe(0);
      expect(metadata.firstMessagePreview).toBe("Untitled Session");
    });

    it("should reject sessions with no user messages", async () => {
      const sessionFile = path.join(testDir, "no-user-messages.jsonl");
      const messages = [
        JSON.stringify({
          type: "assistant",
          message: { content: "Hello from assistant" },
          timestamp: "2025-01-01T10:00:00Z",
        }),
        JSON.stringify({
          type: "assistant",
          message: { content: "Another assistant message" },
          timestamp: "2025-01-01T10:00:05Z",
        }),
      ];
      await fs.writeFile(sessionFile, messages.join("\n"));

      await expect(parseJSONLFile({ filePath: sessionFile })).rejects.toThrow(
        "Session has 2 messages but no user message"
      );
    });

    it("should handle file read errors", async () => {
      const nonexistentFile = path.join(testDir, "nonexistent.jsonl");

      await expect(parseJSONLFile(nonexistentFile)).rejects.toThrow(
        "Failed to parse JSONL file"
      );
    });

    it("should truncate long message previews to 100 characters", async () => {
      const sessionFile = path.join(testDir, "long-message.jsonl");
      const longMessage = "a".repeat(200);
      const messages = [
        JSON.stringify({
          type: "user",
          message: { content: longMessage },
        }),
      ];
      await fs.writeFile(sessionFile, messages.join("\n"));

      const metadata = await parseJSONLFile({ filePath: sessionFile });

      expect(metadata.firstMessagePreview).toHaveLength(100);
      expect(metadata.firstMessagePreview).toBe("a".repeat(100));
    });
  });

  describe("syncProjectSessions", () => {
    it("should sync sessions for a valid project", async () => {
      const projectPath = "/Users/test/myproject";
      const encodedPath = "-Users-test-myproject";
      const projectDir = path.join(
        os.tmpdir(),
        ".claude",
        "projects",
        encodedPath
      );

      await fs.mkdir(projectDir, { recursive: true });

      // Create 2 session files
      const session1 = path.join(projectDir, "session-1.jsonl");
      const session2 = path.join(projectDir, "session-2.jsonl");

      await fs.writeFile(
        session1,
        JSON.stringify({ type: "user", message: { content: "Session 1" } })
      );
      await fs.writeFile(
        session2,
        JSON.stringify({ type: "user", message: { content: "Session 2" } })
      );

      // Mock project lookup
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: testProjectId,
        name: "myproject",
        path: projectPath,
        is_hidden: false,
        is_starred: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock session checks (both are new)
      vi.mocked(prisma.agentSession.findUnique).mockResolvedValue(null);

      // Mock session creation
      vi.mocked(prisma.agentSession.create).mockResolvedValue({
        id: "session-1",
        projectId: testProjectId,
        userId: testUserId,
        name: null,
        agent: "claude" as const,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock finding existing sessions
      vi.mocked(prisma.agentSession.findMany).mockResolvedValue([]);

      const result = await syncProjectSessions(testProjectId, testUserId);

      expect(result.synced).toBe(2);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(vi.mocked(prisma.agentSession.createMany)).toHaveBeenCalledTimes(
        1
      );
    });

    it("should update existing sessions", async () => {
      const projectPath = "/Users/test/myproject";
      const encodedPath = "-Users-test-myproject";
      const projectDir = path.join(
        os.tmpdir(),
        ".claude",
        "projects",
        encodedPath
      );

      await fs.mkdir(projectDir, { recursive: true });

      const sessionFile = path.join(projectDir, "existing-session.jsonl");
      await fs.writeFile(
        sessionFile,
        JSON.stringify({ type: "user", message: { content: "Updated" } })
      );

      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: testProjectId,
        name: "myproject",
        path: projectPath,
        is_hidden: false,
        is_starred: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock existing session
      vi.mocked(prisma.agentSession.findUnique).mockResolvedValue({
        id: "existing-session",
        projectId: testProjectId,
        userId: testUserId,
        name: null,
        agent: "claude" as const,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.mocked(prisma.agentSession.update).mockResolvedValue({
        id: "existing-session",
        projectId: testProjectId,
        userId: testUserId,
        name: null,
        agent: "claude" as const,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.mocked(prisma.agentSession.findMany).mockResolvedValue([
        {
          id: "existing-session",
          projectId: testProjectId,
          userId: testUserId,
          name: null,
          agent: "claude" as const,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await syncProjectSessions(testProjectId, testUserId);

      // Existing sessions are skipped to preserve created_at timestamp
      expect(result.synced).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(vi.mocked(prisma.agentSession.update)).toHaveBeenCalledTimes(0);
    });

    it("should delete orphaned sessions (sessions in DB but no JSONL file)", async () => {
      const projectPath = "/Users/test/myproject";
      const encodedPath = "-Users-test-myproject";
      const projectDir = path.join(
        os.tmpdir(),
        ".claude",
        "projects",
        encodedPath
      );

      await fs.mkdir(projectDir, { recursive: true });

      // Create only one session file
      const sessionFile = path.join(projectDir, "session-1.jsonl");
      await fs.writeFile(
        sessionFile,
        JSON.stringify({ type: "user", message: { content: "Session 1" } })
      );

      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: testProjectId,
        name: "myproject",
        path: projectPath,
        is_hidden: false,
        is_starred: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.mocked(prisma.agentSession.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.agentSession.create).mockResolvedValue({
        id: "session-1",
        projectId: testProjectId,
        userId: testUserId,
        name: null,
        agent: "claude" as const,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock DB has 2 sessions, but only 1 JSONL file exists
      // The orphaned session is old (>5 seconds) and in idle state
      const oldDate = new Date(Date.now() - 10000); // 10 seconds ago
      const sessions = [
        {
          id: "session-1",
          projectId: testProjectId,
          userId: testUserId,
          name: null,
          agent: "claude" as const,
          metadata: {},
          state: "idle" as const,
          error_message: null,
          cli_session_id: null,
          session_path: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "session-orphaned",
          projectId: testProjectId,
          userId: testUserId,
          name: null,
          agent: "claude" as const,
          metadata: {},
          state: "idle" as const,
          error_message: null,
          cli_session_id: null,
          session_path: null,
          created_at: oldDate,
          updated_at: oldDate,
        },
      ];

      // Mock both findMany calls - one for Claude sessions, one for all session IDs
      vi.mocked(prisma.agentSession.findMany)
        .mockResolvedValueOnce(sessions) // First call: Claude sessions
        .mockResolvedValueOnce(sessions.map(s => ({ id: s.id }))); // Second call: all IDs

      vi.mocked(prisma.agentSession.deleteMany).mockResolvedValue({
        count: 1,
      });

      await syncProjectSessions(testProjectId, testUserId);

      // Should delete the orphaned session using deleteMany
      expect(vi.mocked(prisma.agentSession.deleteMany)).toHaveBeenCalledWith({
        where: {
          id: { in: ["session-orphaned"] },
        },
      });
    });

    it("should handle projects with no sessions directory", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: testProjectId,
        name: "myproject",
        path: "/Users/test/no-sessions",
        is_hidden: false,
        is_starred: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await syncProjectSessions(testProjectId, testUserId);

      expect(result.synced).toBe(0);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });

    it("should throw error if project not found", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      await expect(
        syncProjectSessions({ projectId: "nonexistent-id", userId: testUserId })
      ).rejects.toThrow("Project not found: nonexistent-id");
    });

    it("should handle session parsing errors gracefully", async () => {
      const projectPath = "/Users/test/parseproject";
      const encodedPath = "-Users-test-parseproject";
      const projectDir = path.join(
        os.tmpdir(),
        ".claude",
        "projects",
        encodedPath
      );

      await fs.mkdir(projectDir, { recursive: true });

      // Create a session file with malformed lines
      // parseJSONLFile will skip invalid lines but still process valid ones
      const sessionFile = path.join(projectDir, "semi-corrupted.jsonl");
      await fs.writeFile(
        sessionFile,
        [
          "not valid json",
          JSON.stringify({
            type: "user",
            message: { content: "Valid message" },
          }),
          "{incomplete",
        ].join("\n")
      );

      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: testProjectId,
        name: "parseproject",
        path: projectPath,
        is_hidden: false,
        is_starred: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.mocked(prisma.agentSession.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.agentSession.create).mockResolvedValue({
        id: "semi-corrupted",
        projectId: testProjectId,
        userId: testUserId,
        name: null,
        agent: "claude" as const,
        metadata: { messageCount: 1 },
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.mocked(prisma.agentSession.findMany).mockResolvedValue([]);

      const result = await syncProjectSessions(testProjectId, testUserId);

      // Should sync 1 session (with 1 valid message from the semi-corrupted file)
      expect(result.synced).toBe(1);
      expect(result.created).toBe(1);
    });
  });

  describe("getSessionFilePath", () => {
    it("should encode project path correctly", () => {
      const projectPath = "/Users/john/myproject";
      const sessionId = "abc-123-def";

      const filePath = getSessionFilePath(projectPath, sessionId);

      expect(filePath).toBe(
        path.join(
          os.homedir(),
          ".claude",
          "projects",
          "-Users-john-myproject",
          "abc-123-def.jsonl"
        )
      );
    });

    it("should handle project paths with multiple slashes", () => {
      const projectPath = "/Users/john/dev/projects/myproject";
      const sessionId = "session-id";

      const filePath = getSessionFilePath(projectPath, sessionId);

      expect(filePath).toContain("-Users-john-dev-projects-myproject");
    });
  });
});
