import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { ChildProcess, ExecOptions, ExecException } from "child_process";

// Hoist mocks to ensure they're available before module imports
const { mockExec, mockGit } = vi.hoisted(() => {
  const mockExecFn = vi.fn((cmd: string, options: ExecOptions, callback: (error: ExecException | null, result: { stdout: string; stderr: string }) => void) => {
    callback(null, { stdout: "https://github.com/user/repo/pull/123", stderr: "" });
    return {} as ChildProcess;
  });

  const mockGitObj = {
    getRemotes: vi.fn().mockResolvedValue([
      {
        name: "origin",
        refs: {
          push: "https://github.com/user/repo.git",
          fetch: "https://github.com/user/repo.git",
        },
      },
    ]),
    status: vi.fn().mockResolvedValue({ current: "feature/test" }),
  };

  return { mockExec: mockExecFn, mockGit: mockGitObj };
});

// Mock modules before import
vi.mock("simple-git", () => ({
  default: vi.fn(() => mockGit),
}));

vi.mock("child_process", () => ({
  exec: mockExec,
}));

vi.mock("./checkGhCliAvailable");

// Now import after mocks are set up
import { createPullRequest } from "./createPullRequest";
import * as checkGhCliAvailableModule from "./checkGhCliAvailable";

describe("createPullRequest", () => {
  beforeEach(() => {
    // Reset mock implementations
    mockGit.getRemotes.mockResolvedValue([
      {
        name: "origin",
        refs: {
          push: "https://github.com/user/repo.git",
          fetch: "https://github.com/user/repo.git",
        },
      },
    ]);
    mockGit.status.mockResolvedValue({ current: "feature/test" });

    mockExec.mockImplementation((cmd: string, options: ExecOptions, callback: (error: ExecException | null, result: { stdout: string; stderr: string }) => void) => {
      callback(null, { stdout: "https://github.com/user/repo/pull/123", stderr: "" });
      return {} as ChildProcess;
    });

    // Mock checkGhCliAvailable
    vi.mocked(checkGhCliAvailableModule.checkGhCliAvailable).mockResolvedValue(
      false
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates PR using gh CLI when available", async () => {
    // Arrange
    vi.mocked(
      checkGhCliAvailableModule.checkGhCliAvailable
    ).mockResolvedValue(true);

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: new feature",
      description: "This adds a new feature",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.useGhCli).toBe(true);
    expect(result.prUrl).toBe("https://github.com/user/repo/pull/123");
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toContain("gh pr create");
  });

  it("falls back to web URL when gh CLI unavailable", async () => {
    // Arrange
    vi.mocked(
      checkGhCliAvailableModule.checkGhCliAvailable
    ).mockResolvedValue(false);

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: new feature",
      description: "This adds a new feature",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.useGhCli).toBe(false);
    expect(result.prUrl).toContain(
      "https://github.com/user/repo/compare/main...feature/test"
    );
    expect(result.prUrl).toContain("title=feat%3A%20new%20feature");
    expect(result.commands).toContain("git remote -v");
    expect(result.commands).toContain("git status");
  });

  it("falls back to web URL when gh CLI command fails", async () => {
    // Arrange
    vi.mocked(
      checkGhCliAvailableModule.checkGhCliAvailable
    ).mockResolvedValue(true);

    // Mock exec to fail
    mockExec.mockImplementation((cmd: string, options: ExecOptions, callback: (error: ExecException | null, result: { stdout: string; stderr: string }) => void) => {
      callback(new Error("gh: command not found"), null, null);
      return {} as ChildProcess;
    });

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test description",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.useGhCli).toBe(false);
    expect(result.prUrl).toContain("https://github.com/user/repo/compare");
  });

  it("escapes double quotes in title and description for gh CLI", async () => {
    // Arrange
    vi.mocked(
      checkGhCliAvailableModule.checkGhCliAvailable
    ).mockResolvedValue(true);

    const options = {
      projectPath: "/tmp/test-project",
      title: 'feat: add "feature"',
      description: 'Description with "quotes"',
    };

    // Act
    await createPullRequest(options);

    // Assert
    expect(mockExec.mock.calls[0][0]).toContain('\\"feature\\"');
    expect(mockExec.mock.calls[0][0]).toContain('\\"quotes\\"');
  });

  it("uses custom base branch", async () => {
    // Arrange
    vi.mocked(
      checkGhCliAvailableModule.checkGhCliAvailable
    ).mockResolvedValue(false);

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
      baseBranch: "develop",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.prUrl).toContain("compare/develop...feature/test");
  });

  it("handles SSH remote URL", async () => {
    // Arrange
    mockGit.getRemotes.mockResolvedValue([
      {
        name: "origin",
        refs: {
          push: "git@github.com:user/repo.git",
          fetch: "git@github.com:user/repo.git",
        },
      },
    ]);

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.prUrl).toContain("https://github.com/user/repo/compare");
  });

  it("handles remote URL without .git extension", async () => {
    // Arrange
    mockGit.getRemotes.mockResolvedValue([
      {
        name: "origin",
        refs: {
          push: "https://github.com/user/repo",
          fetch: "https://github.com/user/repo",
        },
      },
    ]);

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.prUrl).toContain("https://github.com/user/repo/compare");
  });

  it("handles missing origin remote", async () => {
    // Arrange
    mockGit.getRemotes.mockResolvedValue([
      {
        name: "upstream",
        refs: {
          push: "https://github.com/other/repo.git",
          fetch: "https://github.com/other/repo.git",
        },
      },
    ]);

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("No origin remote found");
  });

  it("handles origin remote with no push URL", async () => {
    // Arrange
    mockGit.getRemotes.mockResolvedValue([
      {
        name: "origin",
        refs: {
          push: undefined,
          fetch: "https://github.com/user/repo.git",
        },
      },
    ]);

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("No origin remote found");
  });

  it("handles non-GitHub remote URL", async () => {
    // Arrange
    mockGit.getRemotes.mockResolvedValue([
      {
        name: "origin",
        refs: {
          push: "https://gitlab.com/user/repo.git",
          fetch: "https://gitlab.com/user/repo.git",
        },
      },
    ]);

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "Could not parse GitHub repository from remote URL"
    );
  });

  it("handles detached HEAD state", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({ current: null });

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.prUrl).toContain("compare/main...HEAD");
  });

  it("URL encodes title and description in web URL", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: add feature with spaces & special chars",
      description: "Description with spaces and & symbols",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.prUrl).toContain("title=feat%3A%20add%20feature");
    expect(result.prUrl).toContain("body=Description%20with%20spaces");
  });

  it("includes expand=1 in web URL", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.prUrl).toContain("expand=1");
  });

  it("handles gh CLI returning no URL", async () => {
    // Arrange
    vi.mocked(
      checkGhCliAvailableModule.checkGhCliAvailable
    ).mockResolvedValue(true);

    // Mock exec to return output without URL
    mockExec.mockImplementation((cmd: string, options: ExecOptions, callback: (error: ExecException | null, result: { stdout: string; stderr: string }) => void) => {
      callback(null, { stdout: "Pull request created", stderr: "" });
      return {} as ChildProcess;
    });

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.useGhCli).toBe(true);
    expect(result.prUrl).toBeUndefined();
  });

  it("handles git getRemotes error", async () => {
    // Arrange
    mockGit.getRemotes.mockRejectedValue(new Error("Failed to get remotes"));

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to get remotes");
  });

  it("handles git status error", async () => {
    // Arrange
    mockGit.status.mockRejectedValue(new Error("Failed to get status"));

    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to get status");
  });

  it("defaults base branch to main", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
      // baseBranch not specified
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.prUrl).toContain("compare/main...");
  });

  it("tracks commands executed", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      title: "feat: test",
      description: "Test",
    };

    // Act
    const result = await createPullRequest(options);

    // Assert
    expect(result.commands).toBeInstanceOf(Array);
    expect(result.commands.length).toBeGreaterThan(0);
  });
});
