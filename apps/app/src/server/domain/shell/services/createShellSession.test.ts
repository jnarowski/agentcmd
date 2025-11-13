import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { createShellSession } from "./createShellSession";
import { getShellSession } from "./getShellSession";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestUser, createTestProject } from "@/server/test-utils/fixtures";
import { createMockPty } from "@/server/test-utils/shell";
import * as pty from "node-pty";
import * as os from "os";

// Mock node-pty
vi.mock("node-pty", () => ({
  spawn: vi.fn(),
}));

// Mock os.platform
vi.mock("os", async () => {
  const actual = await vi.importActual<typeof os>("os");
  return {
    ...actual,
    platform: vi.fn().mockReturnValue("darwin"),
  };
});

describe("createShellSession", () => {
  let userId: string;
  let projectId: string;
  let projectPath: string;
  let mockPtyProcess: ReturnType<typeof createMockPty>;

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

    // Create fresh mock for each test
    mockPtyProcess = createMockPty();
    vi.mocked(pty.spawn).mockReturnValue(mockPtyProcess);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("creates shell session with PTY process", async () => {
    const result = await createShellSession({
      projectId,
      userId,
      cols: 80,
      rows: 24,
    });

    expect(result).toMatchObject({
      sessionId: expect.stringMatching(/^shell_\d+_[a-z0-9]+$/),
      ptyProcess: mockPtyProcess,
    });

    // Verify PTY was spawned with correct args
    expect(pty.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["--login"]),
      expect.objectContaining({
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: projectPath,
        env: expect.objectContaining({
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
          FORCE_COLOR: "3",
        }),
      })
    );
  });

  it("stores session in memory", async () => {
    const result = await createShellSession({
      projectId,
      userId,
      cols: 80,
      rows: 24,
    });

    const session = getShellSession({ sessionId: result.sessionId });
    expect(session).toBeDefined();
    expect(session?.projectId).toBe(projectId);
    expect(session?.userId).toBe(userId);
    expect(session?.ptyProcess).toBe(mockPtyProcess);
  });

  it("uses project path as working directory", async () => {
    await createShellSession({
      projectId,
      userId,
      cols: 80,
      rows: 24,
    });

    expect(pty.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        cwd: projectPath,
      })
    );
  });

  it("throws error for non-existent project", async () => {
    await expect(
      createShellSession({
        projectId: "non-existent-project",
        userId,
        cols: 80,
        rows: 24,
      })
    ).rejects.toThrow("Project not found");
  });

  it("uses bash shell on Unix platforms", async () => {
    vi.mocked(os.platform).mockReturnValue("darwin");
    vi.mocked(pty.spawn).mockClear();

    await createShellSession({
      projectId,
      userId,
      cols: 80,
      rows: 24,
    });

    const calls = vi.mocked(pty.spawn).mock.calls;
    // Should use SHELL env var or bash (on macOS could be bash, zsh, etc.)
    expect(calls[0][0]).toMatch(/(bash|zsh|\/bin\/bash|\/bin\/zsh)/);
  });

  it("uses PowerShell on Windows platforms", async () => {
    vi.mocked(os.platform).mockReturnValue("win32");
    vi.mocked(pty.spawn).mockClear();

    await createShellSession({
      projectId,
      userId,
      cols: 80,
      rows: 24,
    });

    const calls = vi.mocked(pty.spawn).mock.calls;
    expect(calls[0][0]).toBe("powershell.exe");
    expect(calls[0][1]).toEqual(["-NoLogo"]);
  });

  it("generates unique session IDs", async () => {
    const result1 = await createShellSession({
      projectId,
      userId,
      cols: 80,
      rows: 24,
    });

    const result2 = await createShellSession({
      projectId,
      userId,
      cols: 80,
      rows: 24,
    });

    expect(result1.sessionId).not.toBe(result2.sessionId);
  });

  it("handles custom terminal dimensions", async () => {
    await createShellSession({
      projectId,
      userId,
      cols: 120,
      rows: 40,
    });

    expect(pty.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        cols: 120,
        rows: 40,
      })
    );
  });

  it("sets color environment variables", async () => {
    await createShellSession({
      projectId,
      userId,
      cols: 80,
      rows: 24,
    });

    expect(pty.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
          FORCE_COLOR: "3",
        }),
      })
    );
  });
});
