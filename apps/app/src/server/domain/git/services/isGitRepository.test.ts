import { describe, it, expect, vi, afterEach } from "vitest";
import { isGitRepository } from "./isGitRepository";
import * as getCurrentBranchModule from "./getCurrentBranch";
import fs from "node:fs";

// Mock filesystem
vi.mock("node:fs");

// Mock getCurrentBranch
vi.mock("./getCurrentBranch", () => ({
  getCurrentBranch: vi.fn(),
}));

describe("isGitRepository", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("detects git repository correctly with branch", async () => {
    // Arrange
    const projectPath = "/tmp/git-project";
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(getCurrentBranchModule.getCurrentBranch).mockResolvedValue("main");

    // Act
    const result = await isGitRepository(projectPath);

    // Assert
    expect(result.initialized).toBe(true);
    expect(result.branch).toBe("main");
    expect(result.error).toBeNull();
    expect(fs.existsSync).toHaveBeenCalledWith("/tmp/git-project/.git");
  });

  it("handles non-git directories", async () => {
    // Arrange
    const projectPath = "/tmp/non-git-project";
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Act
    const result = await isGitRepository(projectPath);

    // Assert
    expect(result.initialized).toBe(false);
    expect(result.branch).toBeNull();
    expect(result.error).toBeNull();
    expect(fs.existsSync).toHaveBeenCalledWith("/tmp/non-git-project/.git");
    expect(getCurrentBranchModule.getCurrentBranch).not.toHaveBeenCalled();
  });

  it("handles git command failures gracefully", async () => {
    // Arrange
    const projectPath = "/tmp/git-error-project";
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(getCurrentBranchModule.getCurrentBranch).mockRejectedValue(
      new Error("Git command failed")
    );

    // Act
    const result = await isGitRepository(projectPath);

    // Assert
    expect(result.initialized).toBe(false);
    expect(result.branch).toBeNull();
    expect(result.error).toBe("Git command failed");
  });

  it("handles detached HEAD state", async () => {
    // Arrange
    const projectPath = "/tmp/detached-head-project";
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(getCurrentBranchModule.getCurrentBranch).mockResolvedValue(null);

    // Act
    const result = await isGitRepository(projectPath);

    // Assert
    expect(result.initialized).toBe(true);
    expect(result.branch).toBeNull();
    expect(result.error).toBeNull();
  });

  it("handles filesystem errors", async () => {
    // Arrange
    const projectPath = "/tmp/fs-error-project";
    vi.mocked(fs.existsSync).mockImplementation(() => {
      throw new Error("Permission denied");
    });

    // Act
    const result = await isGitRepository(projectPath);

    // Assert
    expect(result.initialized).toBe(false);
    expect(result.branch).toBeNull();
    expect(result.error).toBe("Permission denied");
  });

  it("detects feature branch", async () => {
    // Arrange
    const projectPath = "/tmp/feature-project";
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(getCurrentBranchModule.getCurrentBranch).mockResolvedValue(
      "feature/new-feature"
    );

    // Act
    const result = await isGitRepository(projectPath);

    // Assert
    expect(result.initialized).toBe(true);
    expect(result.branch).toBe("feature/new-feature");
    expect(result.error).toBeNull();
  });
});
