import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createAndSwitchBranch } from "./createAndSwitchBranch";
import type { SimpleGit } from "simple-git";

// Mock simple-git
vi.mock("simple-git");

describe("createAndSwitchBranch", () => {
  let mockGit: {
    branchLocal: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    commit: ReturnType<typeof vi.fn>;
    checkout: ReturnType<typeof vi.fn>;
    checkoutLocalBranch: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const simpleGit = await import("simple-git");
    mockGit = {
      branchLocal: vi.fn().mockResolvedValue({ current: "main", all: ["main"] }),
      status: vi.fn().mockResolvedValue({ files: [] }),
      add: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue({ commit: "abc123" }),
      checkout: vi.fn().mockResolvedValue(undefined),
      checkoutLocalBranch: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as unknown as SimpleGit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates and switches to new branch without uncommitted changes", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({ files: [] });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/new-feature",
    };

    // Act
    const result = await createAndSwitchBranch(options);

    // Assert
    expect(mockGit.status).toHaveBeenCalled();
    expect(mockGit.add).not.toHaveBeenCalled();
    expect(mockGit.commit).not.toHaveBeenCalled();
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(
      "feature/new-feature"
    );
    expect(result.branch.name).toBe("feature/new-feature");
    expect(result.branch.current).toBe(true);
    expect(result.commands).toEqual(["git checkout -b feature/new-feature"]);
  });

  it("commits uncommitted changes before creating branch", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({
      files: [
        { path: "src/app.ts", working_dir: "M" },
        { path: "src/utils.ts", working_dir: "M" },
      ],
    });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/auto-commit",
    };

    // Act
    const result = await createAndSwitchBranch(options);

    // Assert
    expect(mockGit.add).toHaveBeenCalledWith(".");
    expect(mockGit.commit).toHaveBeenCalledWith(
      'Auto-commit before switching to branch "feature/auto-commit"'
    );
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(
      "feature/auto-commit"
    );
    expect(result.commands).toContain("git add .");
    expect(result.commands).toContain(
      'git commit -m "Auto-commit before switching to branch \\"feature/auto-commit\\""'
    );
    expect(result.commands).toContain("git checkout -b feature/auto-commit");
  });

  it("creates branch from specified base branch", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({ files: [] });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/from-develop",
      from: "develop",
    };

    // Act
    const result = await createAndSwitchBranch(options);

    // Assert
    expect(mockGit.checkout).toHaveBeenCalledWith("develop");
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(
      "feature/from-develop"
    );
    expect(result.commands).toContain("git checkout develop");
    expect(result.commands).toContain("git checkout -b feature/from-develop");
  });

  it("validates branch name - allows valid names", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({ files: [] });
    const validNames = [
      "feature/new-feature",
      "bugfix/issue-123",
      "release/1.0.0",
      "feature_test",
      "hotfix-urgent",
    ];

    // Act & Assert
    for (const branchName of validNames) {
      const options = {
        projectPath: "/tmp/test-project",
        branchName,
      };

      await expect(createAndSwitchBranch(options)).resolves.toBeDefined();
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(branchName);
      vi.clearAllMocks();
    }
  });

  it("validates branch name - rejects invalid names", async () => {
    // Arrange
    const invalidNames = [
      "feature with spaces",
      "feature@special",
      "feature#hash",
      "feature$dollar",
      "feature!exclaim",
    ];

    // Act & Assert
    for (const branchName of invalidNames) {
      const options = {
        projectPath: "/tmp/test-project",
        branchName,
      };

      await expect(createAndSwitchBranch(options)).rejects.toThrow(
        "Invalid branch name"
      );
    }
  });

  it("switches to existing branch instead of failing (idempotent)", async () => {
    // Arrange - branch already exists
    mockGit.branchLocal.mockResolvedValue({
      current: "main",
      all: ["main", "feature/exists"],
    });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/exists",
    };

    // Act
    const result = await createAndSwitchBranch(options);

    // Assert - should checkout existing branch, not create
    expect(mockGit.checkout).toHaveBeenCalledWith("feature/exists");
    expect(mockGit.checkoutLocalBranch).not.toHaveBeenCalled();
    expect(result.commands).toEqual(["git checkout feature/exists"]);
  });

  it("returns early if already on target branch (idempotent)", async () => {
    // Arrange - already on target branch
    mockGit.branchLocal.mockResolvedValue({
      current: "feature/current",
      all: ["main", "feature/current"],
    });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/current",
    };

    // Act
    const result = await createAndSwitchBranch(options);

    // Assert - no-op, return success
    expect(mockGit.status).not.toHaveBeenCalled();
    expect(mockGit.checkout).not.toHaveBeenCalled();
    expect(mockGit.checkoutLocalBranch).not.toHaveBeenCalled();
    expect(result.commands).toEqual([]);
    expect(result.branch.name).toBe("feature/current");
  });

  it("handles git status error", async () => {
    // Arrange
    mockGit.status.mockRejectedValue(new Error("Git status failed"));
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/test",
    };

    // Act & Assert
    await expect(createAndSwitchBranch(options)).rejects.toThrow(
      "Git status failed"
    );
  });

  it("handles git checkout error from base branch", async () => {
    // Arrange
    mockGit.checkout.mockRejectedValue(new Error("Branch 'develop' not found"));
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/test",
      from: "develop",
    };

    // Act & Assert
    await expect(createAndSwitchBranch(options)).rejects.toThrow(
      "Branch 'develop' not found"
    );
  });

  it("handles untracked files in uncommitted changes", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({
      files: [
        { path: "src/new-file.ts", working_dir: "?" },
        { path: "src/modified.ts", working_dir: "M" },
      ],
    });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/with-untracked",
    };

    // Act
    await createAndSwitchBranch(options);

    // Assert
    expect(mockGit.add).toHaveBeenCalledWith(".");
    expect(mockGit.commit).toHaveBeenCalled();
  });

  it("rejects branch names with invalid characters (double quotes)", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      branchName: 'feature/"quoted"',
    };

    // Act & Assert
    await expect(createAndSwitchBranch(options)).rejects.toThrow(
      'Invalid branch name. Only alphanumeric, dash, underscore, dot, and slash allowed.'
    );
  });

  it("tracks command execution order with uncommitted changes", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({
      files: [{ path: "src/app.ts", working_dir: "M" }],
    });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/test",
      from: "develop",
    };

    // Act
    const result = await createAndSwitchBranch(options);

    // Assert
    expect(result.commands).toHaveLength(4);
    expect(result.commands[0]).toBe("git add .");
    expect(result.commands[1]).toContain("git commit");
    expect(result.commands[2]).toBe("git checkout develop");
    expect(result.commands[3]).toBe("git checkout -b feature/test");
  });

  it("handles empty project path", async () => {
    // Arrange
    const options = {
      projectPath: "",
      branchName: "feature/test",
    };

    // Act
    await createAndSwitchBranch(options);

    // Assert - simpleGit should be called with empty string
    const simpleGit = await import("simple-git");
    expect(simpleGit.default).toHaveBeenCalledWith("");
  });

  it("creates branch with numeric name", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({ files: [] });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "release/123456",
    };

    // Act
    await createAndSwitchBranch(options);

    // Assert
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith("release/123456");
  });

  it("handles staged changes as uncommitted", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({
      files: [{ path: "src/app.ts", index: "M", working_dir: " " }],
    });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "feature/staged",
    };

    // Act
    await createAndSwitchBranch(options);

    // Assert
    expect(mockGit.add).toHaveBeenCalledWith(".");
    expect(mockGit.commit).toHaveBeenCalled();
  });

  it("creates deeply nested branch name", async () => {
    // Arrange
    mockGit.status.mockResolvedValue({ files: [] });
    const options = {
      projectPath: "/tmp/test-project",
      branchName: "team/frontend/feature/new-component",
    };

    // Act
    const result = await createAndSwitchBranch(options);

    // Assert
    expect(result.branch.name).toBe("team/frontend/feature/new-component");
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(
      "team/frontend/feature/new-component"
    );
  });
});
