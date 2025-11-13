import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { commitChanges } from "./commitChanges";

// Mock simple-git
vi.mock("simple-git");

describe("commitChanges", () => {
  let mockGit: any;

  beforeEach(async () => {
    const simpleGit = await import("simple-git");
    mockGit = {
      add: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue({ commit: "abc123def456" }),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stages and commits files successfully", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "feat: add new feature",
      files: ["src/app.ts", "src/utils.ts"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.add).toHaveBeenCalledWith(["src/app.ts", "src/utils.ts"]);
    expect(mockGit.commit).toHaveBeenCalledWith("feat: add new feature");
    expect(result.commitSha).toBe("abc123def456");
    expect(result.commands).toEqual([
      "git add src/app.ts src/utils.ts",
      'git commit -m "feat: add new feature"',
    ]);
  });

  it("commits single file", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "fix: bug in calculation",
      files: ["src/calculator.ts"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.add).toHaveBeenCalledWith(["src/calculator.ts"]);
    expect(mockGit.commit).toHaveBeenCalledWith("fix: bug in calculation");
    expect(result.commitSha).toBe("abc123def456");
  });

  it("escapes double quotes in commit message", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: 'feat: add "feature"',
      files: ["src/app.ts"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.commit).toHaveBeenCalledWith('feat: add "feature"');
    expect(result.commands[1]).toBe('git commit -m "feat: add \\"feature\\""');
  });

  it("handles multiple files with spaces in names", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "docs: update readme",
      files: ["README.md", "docs/Getting Started.md"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.add).toHaveBeenCalledWith([
      "README.md",
      "docs/Getting Started.md",
    ]);
    expect(result.commands[0]).toBe("git add README.md docs/Getting Started.md");
  });

  it("returns correct commit SHA", async () => {
    // Arrange
    mockGit.commit.mockResolvedValue({ commit: "1234567890abcdef" });
    const options = {
      projectPath: "/tmp/test-project",
      message: "test: add tests",
      files: ["tests/app.test.ts"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(result.commitSha).toBe("1234567890abcdef");
  });

  it("handles git add errors", async () => {
    // Arrange
    mockGit.add.mockRejectedValue(new Error("Failed to stage files"));
    const options = {
      projectPath: "/tmp/test-project",
      message: "test commit",
      files: ["src/app.ts"],
    };

    // Act & Assert
    await expect(commitChanges(options)).rejects.toThrow("Failed to stage files");
  });

  it("handles git commit errors", async () => {
    // Arrange
    mockGit.commit.mockRejectedValue(new Error("No changes to commit"));
    const options = {
      projectPath: "/tmp/test-project",
      message: "test commit",
      files: ["src/app.ts"],
    };

    // Act & Assert
    await expect(commitChanges(options)).rejects.toThrow("No changes to commit");
  });

  it("handles empty commit message", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "",
      files: ["src/app.ts"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.commit).toHaveBeenCalledWith("");
    expect(result.commands[1]).toBe('git commit -m ""');
  });

  it("commits all tracked files when array contains '.'", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "chore: update all files",
      files: ["."],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.add).toHaveBeenCalledWith(["."]);
    expect(result.commands[0]).toBe("git add .");
  });

  it("handles long commit messages", async () => {
    // Arrange
    const longMessage = "feat: " + "a".repeat(500);
    const options = {
      projectPath: "/tmp/test-project",
      message: longMessage,
      files: ["src/app.ts"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.commit).toHaveBeenCalledWith(longMessage);
    expect(result.commitSha).toBe("abc123def456");
  });

  it("handles commit message with newlines", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "feat: new feature\n\nDetailed description here",
      files: ["src/app.ts"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.commit).toHaveBeenCalledWith(
      "feat: new feature\n\nDetailed description here"
    );
  });

  it("handles merge conflict scenario", async () => {
    // Arrange
    mockGit.commit.mockRejectedValue(
      new Error("Merge conflict in src/app.ts")
    );
    const options = {
      projectPath: "/tmp/test-project",
      message: "fix: resolve conflicts",
      files: ["src/app.ts"],
    };

    // Act & Assert
    await expect(commitChanges(options)).rejects.toThrow(
      "Merge conflict in src/app.ts"
    );
  });

  it("tracks command execution order", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "test: verify order",
      files: ["file1.ts", "file2.ts"],
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(result.commands).toHaveLength(2);
    expect(result.commands[0]).toContain("git add");
    expect(result.commands[1]).toContain("git commit");
  });
});
