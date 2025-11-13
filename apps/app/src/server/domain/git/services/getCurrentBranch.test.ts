import { describe, it, expect, vi, afterEach } from "vitest";
import { getCurrentBranch } from "./getCurrentBranch";
import simpleGit, { type SimpleGit } from "simple-git";

// Mock simple-git
vi.mock("simple-git");

describe("getCurrentBranch", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns current branch name", async () => {
    // Arrange
    const mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      branch: vi.fn().mockResolvedValue({ current: "main" }),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as SimpleGit);

    // Act
    const result = await getCurrentBranch({ projectPath: "/tmp/project" });

    // Assert
    expect(result).toBe("main");
    expect(mockGit.checkIsRepo).toHaveBeenCalled();
    expect(mockGit.branch).toHaveBeenCalled();
  });

  it("handles detached HEAD state", async () => {
    // Arrange
    const mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      branch: vi.fn().mockResolvedValue({ current: "" }),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as SimpleGit);

    // Act
    const result = await getCurrentBranch({ projectPath: "/tmp/project" });

    // Assert
    expect(result).toBeNull();
  });

  it("returns null for non-git repository", async () => {
    // Arrange
    const mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(false),
      branch: vi.fn(),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as SimpleGit);

    // Act
    const result = await getCurrentBranch({ projectPath: "/tmp/non-git" });

    // Assert
    expect(result).toBeNull();
    expect(mockGit.checkIsRepo).toHaveBeenCalled();
    expect(mockGit.branch).not.toHaveBeenCalled();
  });

  it("handles git command errors gracefully", async () => {
    // Arrange
    const mockGit = {
      checkIsRepo: vi.fn().mockRejectedValue(new Error("Git not found")),
      branch: vi.fn(),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as SimpleGit);

    // Act
    const result = await getCurrentBranch({ projectPath: "/tmp/project" });

    // Assert
    expect(result).toBeNull();
  });

  it("returns feature branch name", async () => {
    // Arrange
    const mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      branch: vi.fn().mockResolvedValue({ current: "feature/new-feature" }),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as SimpleGit);

    // Act
    const result = await getCurrentBranch({
      projectPath: "/tmp/feature-project",
    });

    // Assert
    expect(result).toBe("feature/new-feature");
  });

  it("handles branch command errors", async () => {
    // Arrange
    const mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      branch: vi.fn().mockRejectedValue(new Error("Branch command failed")),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as SimpleGit);

    // Act
    const result = await getCurrentBranch({ projectPath: "/tmp/project" });

    // Assert
    expect(result).toBeNull();
  });

  it("handles branch with undefined current", async () => {
    // Arrange
    const mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      branch: vi.fn().mockResolvedValue({ current: undefined }),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as SimpleGit);

    // Act
    const result = await getCurrentBranch({ projectPath: "/tmp/project" });

    // Assert
    expect(result).toBeNull();
  });
});
