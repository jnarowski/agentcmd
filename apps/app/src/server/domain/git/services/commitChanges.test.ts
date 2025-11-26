import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { commitChanges } from "./commitChanges";
import type { SimpleGit } from "simple-git";

// Mock simple-git
vi.mock("simple-git");

describe("commitChanges", () => {
  let mockGit: {
    add: ReturnType<typeof vi.fn>;
    commit: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const simpleGit = await import("simple-git");
    mockGit = {
      add: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue({ commit: "abc123def456" }),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as unknown as SimpleGit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stages all and commits successfully", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "feat: add new feature",
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.add).toHaveBeenCalledWith(".");
    expect(mockGit.commit).toHaveBeenCalledWith("feat: add new feature");
    expect(result.commitSha).toBe("abc123def456");
    expect(result.commands).toEqual([
      'git add . && git commit -m "feat: add new feature"',
    ]);
  });

  it("escapes double quotes in commit message for command string", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: 'feat: add "feature"',
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.commit).toHaveBeenCalledWith('feat: add "feature"');
    expect(result.commands[0]).toBe('git add . && git commit -m "feat: add \\"feature\\""');
  });

  it("returns correct commit SHA", async () => {
    // Arrange
    mockGit.commit.mockResolvedValue({ commit: "1234567890abcdef" });
    const options = {
      projectPath: "/tmp/test-project",
      message: "test: add tests",
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
    };

    // Act & Assert
    await expect(commitChanges(options)).rejects.toThrow("No changes to commit");
  });

  it("handles empty commit message", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "",
    };

    // Act
    const result = await commitChanges(options);

    // Assert
    expect(mockGit.commit).toHaveBeenCalledWith("");
    expect(result.commands[0]).toBe('git add . && git commit -m ""');
  });

  it("handles long commit messages", async () => {
    // Arrange
    const longMessage = "feat: " + "a".repeat(500);
    const options = {
      projectPath: "/tmp/test-project",
      message: longMessage,
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
    };

    // Act
    await commitChanges(options);

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
    };

    // Act & Assert
    await expect(commitChanges(options)).rejects.toThrow(
      "Merge conflict in src/app.ts"
    );
  });

  it("returns single combined command", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      message: "test: verify command",
    };

    // Act
    const result = await commitChanges(options);

    // Assert - now uses combined command
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toContain("git add");
    expect(result.commands[0]).toContain("git commit");
  });
});
