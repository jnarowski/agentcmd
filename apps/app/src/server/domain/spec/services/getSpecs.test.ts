/**
 * Unit tests for getTasks service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTasks, clearTasksCache } from "./getTasks";
import * as scanSpecsModule from "./scanSpecs";
import * as getSessionsModule from "@/server/domain/session/services/getSessions";
import { prisma } from "@/shared/prisma";

vi.mock("./scanSpecs");
vi.mock("@/server/domain/session/services/getSessions");
vi.mock("@/shared/prisma", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
  },
}));

describe("getTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTasksCache(); // Clear cache before each test
  });

  afterEach(() => {
    clearTasksCache();
  });

  it("should aggregate specs from all projects and planning sessions", async () => {
    const mockProjects = [
      { id: "project-1", path: "/path/to/project1" },
      { id: "project-2", path: "/path/to/project2" },
    ];

    const mockTasks1 = [
      {
        id: "251112070556",
        name: "Tasks Nav Workflow Integration",
        specPath: "todo/251112070556-tasks-nav-workflow-integration",
        projectId: "project-1",
        status: "in-progress",
        created_at: "2025-11-12T07:05:56.000Z",
      },
    ];

    const mockTasks2 = [
      {
        id: "251112070557",
        name: "Another Task",
        specPath: "todo/251112070557-another-task",
        projectId: "project-2",
        status: "draft",
        created_at: "2025-11-12T08:00:00.000Z",
      },
    ];

    const mockSessions = [
      {
        id: "session-1",
        projectId: "project-1",
        userId: "user-1",
        name: "Planning Session",
        agent: "claude",
        type: "planning",
        cli_session_id: undefined,
        session_path: undefined,
        metadata: {},
        state: "idle",
        error_message: undefined,
        is_archived: false,
        archived_at: null,
        created_at: new Date("2025-11-12T08:00:00.000Z"),
        updated_at: new Date("2025-11-12T08:00:00.000Z"),
      },
    ];

    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);
    vi.mocked(scanSpecsModule.scanSpecs)
      .mockResolvedValueOnce(mockTasks1)
      .mockResolvedValueOnce(mockTasks2);
    vi.mocked(getSessionsModule.getSessions).mockResolvedValue(mockSessions);

    const result = await getTasks("user-1");

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].projectId).toBe("project-1");
    expect(result.tasks[1].projectId).toBe("project-2");
    expect(result.planningSessions).toHaveLength(1);
    expect(result.planningSessions[0].id).toBe("session-1");
  });

  it("should filter planning sessions by type and not require projectId", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);
    vi.mocked(getSessionsModule.getSessions).mockResolvedValue([]);

    await getTasks("user-1");

    expect(getSessionsModule.getSessions).toHaveBeenCalledWith({
      userId: "user-1",
      permission_mode: "plan",
      projectId: undefined,
      includeArchived: false,
      limit: 50,
    });
  });

  it("should cache results for 30 seconds", async () => {
    const mockProjects = [{ id: "project-1", path: "/path/to/project1" }];
    const mockTasks = [
      {
        id: "251112070556",
        name: "Test Task",
        specPath: "todo/test",
        projectId: "project-1",
        status: "draft",
        created_at: "2025-11-12T07:05:56.000Z",
      },
    ];

    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);
    vi.mocked(scanSpecsModule.scanSpecs).mockResolvedValue(mockTasks);
    vi.mocked(getSessionsModule.getSessions).mockResolvedValue([]);

    // First call
    await getTasks("user-1");

    // Second call should use cache
    await getTasks("user-1");

    // Should only call once (cached on second call)
    expect(prisma.project.findMany).toHaveBeenCalledTimes(1);
    expect(scanSpecsModule.scanSpecs).toHaveBeenCalledTimes(1);
    expect(getSessionsModule.getSessions).toHaveBeenCalledTimes(1);
  });

  it("should respect cache per user", async () => {
    const mockProjects = [{ id: "project-1", path: "/path/to/project1" }];

    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);
    vi.mocked(scanSpecsModule.scanSpecs).mockResolvedValue([]);
    vi.mocked(getSessionsModule.getSessions).mockResolvedValue([]);

    // User 1
    await getTasks("user-1");

    // User 2 should trigger new fetch
    await getTasks("user-2");

    // Should call twice (once per user)
    expect(prisma.project.findMany).toHaveBeenCalledTimes(2);
    expect(scanSpecsModule.scanSpecs).toHaveBeenCalledTimes(2);
    expect(getSessionsModule.getSessions).toHaveBeenCalledTimes(2);
  });

  it("should clear cache when clearTasksCache is called", async () => {
    const mockProjects = [{ id: "project-1", path: "/path/to/project1" }];

    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);
    vi.mocked(scanSpecsModule.scanSpecs).mockResolvedValue([]);
    vi.mocked(getSessionsModule.getSessions).mockResolvedValue([]);

    // First call
    await getTasks("user-1");

    // Clear cache
    clearTasksCache();

    // Second call should fetch again
    await getTasks("user-1");

    // Should call twice
    expect(prisma.project.findMany).toHaveBeenCalledTimes(2);
    expect(scanSpecsModule.scanSpecs).toHaveBeenCalledTimes(2);
    expect(getSessionsModule.getSessions).toHaveBeenCalledTimes(2);
  });

  it("should return sessions from getSessions directly", async () => {
    const mockProjects = [{ id: "project-1", path: "/path/to/project1" }];
    const mockSession = {
      id: "session-1",
      projectId: "project-1",
      userId: "user-1",
      name: "Test Session",
      agent: "claude",
      type: "planning",
      cli_session_id: "cli-123",
      session_path: "/path/to/session",
      metadata: { key: "value" },
      state: "idle",
      error_message: "some error",
      is_archived: false,
      archived_at: null,
      created_at: new Date("2025-11-12T08:00:00.000Z"),
      updated_at: new Date("2025-11-12T08:00:00.000Z"),
    };

    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);
    vi.mocked(scanSpecsModule.scanSpecs).mockResolvedValue([]);
    vi.mocked(getSessionsModule.getSessions).mockResolvedValue([mockSession]);

    const result = await getTasks("user-1");

    expect(result.planningSessions[0]).toMatchObject({
      id: "session-1",
      projectId: "project-1",
      userId: "user-1",
      name: "Test Session",
      agent: "claude",
      type: "planning",
      state: "idle",
      is_archived: false,
      created_at: mockSession.created_at,
      updated_at: mockSession.updated_at,
    });
  });
});
