import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { createSession } from "./createSession";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestUser, createTestProject } from "@/server/test-utils/fixtures";

// Mock path utility
vi.mock("@/server/utils/path", () => ({
  getSessionFilePath: vi
    .fn()
    .mockImplementation((projectPath: string, sessionId: string) => {
      return `${projectPath}/.claude/sessions/${sessionId}.jsonl`;
    }),
}));

describe("createSession", () => {
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
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("creates session with valid data", async () => {
    const sessionId = "test-session-id";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
      },
    });

    expect(session).toMatchObject({
      id: sessionId,
      projectId,
      userId,
      agent: "claude",
      type: "chat",
      permission_mode: "default",
      state: "working",
    });

    // Verify in database
    const dbSession = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });
    expect(dbSession).toBeTruthy();
    expect(dbSession?.projectId).toBe(projectId);
  });

  it("creates session with custom agent type", async () => {
    const sessionId = "test-codex-session";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
        agent: "codex",
      },
    });

    expect(session.agent).toBe("codex");
  });

  it("creates session with workflow type", async () => {
    const sessionId = "test-workflow-session";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
        type: "workflow",
      },
    });

    expect(session.type).toBe("workflow");
  });

  it("creates session with custom name", async () => {
    const sessionId = "test-named-session";
    const name = "My Custom Session";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
        name,
      },
    });

    expect(session.name).toBe(name);
  });

  it("creates session with custom permission mode", async () => {
    const sessionId = "test-plan-session";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
        permission_mode: "plan",
      },
    });

    expect(session.permission_mode).toBe("plan");
  });

  it("sets cli_session_id when provided", async () => {
    const sessionId = "db-session-id";
    const cliSessionId = "cli-session-id";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
        cli_session_id: cliSessionId,
      },
    });

    expect(session.cli_session_id).toBe(cliSessionId);

    // Verify in database
    const dbSession = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });
    expect(dbSession?.cli_session_id).toBe(cliSessionId);
  });

  it("defaults cli_session_id to session id when not provided", async () => {
    const sessionId = "test-session-id";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
      },
    });

    // Should default to session ID
    expect(session.cli_session_id).toBe(sessionId);
  });

  it("sets session_path correctly", async () => {
    const sessionId = "test-session-path";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
      },
    });

    expect(session.session_path).toBe(
      `${projectPath}/.claude/sessions/${sessionId}.jsonl`
    );
  });

  it("initializes default metadata", async () => {
    const sessionId = "test-metadata-session";

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
      },
    });

    expect(session.metadata).toMatchObject({
      totalTokens: 0,
      messageCount: 0,
      firstMessagePreview: "",
    });
    expect(session.metadata.lastMessageAt).toBeTruthy();
  });

  it("uses custom metadata override", async () => {
    const sessionId = "test-custom-metadata";
    const customMetadata = {
      totalTokens: 1000,
      messageCount: 5,
      lastMessageAt: new Date().toISOString(),
      firstMessagePreview: "Custom preview",
    };

    const session = await createSession({
      data: {
        projectId,
        userId,
        sessionId,
        metadataOverride: customMetadata,
      },
    });

    expect(session.metadata).toMatchObject(customMetadata);
  });

  it("throws error for non-existent project", async () => {
    const sessionId = "test-invalid-project";
    const invalidProjectId = "invalid-project-id";

    await expect(
      createSession({
        data: {
          projectId: invalidProjectId,
          userId,
          sessionId,
        },
      })
    ).rejects.toThrow(`Project not found: ${invalidProjectId}`);
  });

  it("creates multiple sessions for same project", async () => {
    const session1Id = "session-1";
    const session2Id = "session-2";

    const session1 = await createSession({
      data: { projectId, userId, sessionId: session1Id },
    });

    const session2 = await createSession({
      data: { projectId, userId, sessionId: session2Id },
    });

    expect(session1.id).toBe(session1Id);
    expect(session2.id).toBe(session2Id);
    expect(session1.projectId).toBe(projectId);
    expect(session2.projectId).toBe(projectId);

    // Verify both exist in database
    const count = await prisma.agentSession.count({
      where: { projectId },
    });
    expect(count).toBe(2);
  });

  it("handles concurrent session creation", async () => {
    const sessionPromises = Array.from({ length: 5 }, (_, i) =>
      createSession({
        data: {
          projectId,
          userId,
          sessionId: `concurrent-session-${i}`,
        },
      })
    );

    const sessions = await Promise.all(sessionPromises);

    expect(sessions).toHaveLength(5);
    expect(new Set(sessions.map((s) => s.id)).size).toBe(5); // All unique

    // Verify all in database
    const count = await prisma.agentSession.count({
      where: { projectId },
    });
    expect(count).toBe(5);
  });

  it("sets initial state to working", async () => {
    const sessionId = "test-state-session";

    const session = await createSession({
      data: { projectId, userId, sessionId },
    });

    expect(session.state).toBe("working");
    expect(session.error_message).toBeUndefined();
  });

  it("sets is_archived to false initially", async () => {
    const sessionId = "test-archived-session";

    const session = await createSession({
      data: { projectId, userId, sessionId },
    });

    expect(session.is_archived).toBe(false);
    expect(session.archived_at).toBeNull();
  });

  it("sets created_at and updated_at timestamps", async () => {
    const sessionId = "test-timestamps";

    const session = await createSession({
      data: { projectId, userId, sessionId },
    });

    expect(session.created_at).toBeInstanceOf(Date);
    expect(session.updated_at).toBeInstanceOf(Date);
    expect(session.created_at.getTime()).toBeLessThanOrEqual(
      session.updated_at.getTime()
    );
  });
});
