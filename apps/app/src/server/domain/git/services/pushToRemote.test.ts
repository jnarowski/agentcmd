import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { pushToRemote } from "./pushToRemote";

// Mock simple-git
vi.mock("simple-git");

describe("pushToRemote", () => {
  let mockGit: any;

  beforeEach(async () => {
    const simpleGit = await import("simple-git");
    mockGit = {
      push: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("pushes branch to origin with set-upstream", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      branch: "feature/new-feature",
    };

    // Act
    await pushToRemote(options);

    // Assert
    expect(mockGit.push).toHaveBeenCalledWith("origin", "feature/new-feature", [
      "--set-upstream",
    ]);
  });

  it("pushes to custom remote", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      branch: "main",
      remote: "upstream",
    };

    // Act
    await pushToRemote(options);

    // Assert
    expect(mockGit.push).toHaveBeenCalledWith("upstream", "main", [
      "--set-upstream",
    ]);
  });

  it("defaults to origin remote when not specified", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      branch: "develop",
    };

    // Act
    await pushToRemote(options);

    // Assert
    expect(mockGit.push).toHaveBeenCalledWith("origin", "develop", [
      "--set-upstream",
    ]);
  });

  it("handles authentication failure", async () => {
    // Arrange
    mockGit.push.mockRejectedValue(new Error("Authentication failed"));
    const options = {
      projectPath: "/tmp/test-project",
      branch: "feature/test",
    };

    // Act & Assert
    await expect(pushToRemote(options)).rejects.toThrow(
      "Authentication failed"
    );
  });

  it("handles network errors", async () => {
    // Arrange
    mockGit.push.mockRejectedValue(
      new Error("Could not resolve host: github.com")
    );
    const options = {
      projectPath: "/tmp/test-project",
      branch: "feature/test",
    };

    // Act & Assert
    await expect(pushToRemote(options)).rejects.toThrow(
      "Could not resolve host"
    );
  });

  it("handles non-fast-forward push error", async () => {
    // Arrange
    mockGit.push.mockRejectedValue(
      new Error(
        "Updates were rejected because the remote contains work that you do not have locally"
      )
    );
    const options = {
      projectPath: "/tmp/test-project",
      branch: "main",
    };

    // Act & Assert
    await expect(pushToRemote(options)).rejects.toThrow("Updates were rejected");
  });

  it("handles upstream not set error", async () => {
    // Arrange
    mockGit.push.mockRejectedValue(
      new Error("The current branch has no upstream branch")
    );
    const options = {
      projectPath: "/tmp/test-project",
      branch: "feature/new",
    };

    // Act & Assert
    await expect(pushToRemote(options)).rejects.toThrow("no upstream branch");
  });

  it("pushes branch with slashes in name", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      branch: "feature/user/new-feature",
    };

    // Act
    await pushToRemote(options);

    // Assert
    expect(mockGit.push).toHaveBeenCalledWith(
      "origin",
      "feature/user/new-feature",
      ["--set-upstream"]
    );
  });

  it("pushes to multiple remotes sequentially", async () => {
    // Arrange
    const branch = "main";
    const projectPath = "/tmp/test-project";

    // Act
    await pushToRemote({ projectPath, branch, remote: "origin" });
    await pushToRemote({ projectPath, branch, remote: "backup" });

    // Assert
    expect(mockGit.push).toHaveBeenCalledTimes(2);
    expect(mockGit.push).toHaveBeenNthCalledWith(1, "origin", "main", [
      "--set-upstream",
    ]);
    expect(mockGit.push).toHaveBeenNthCalledWith(2, "backup", "main", [
      "--set-upstream",
    ]);
  });

  it("handles permission denied error", async () => {
    // Arrange
    mockGit.push.mockRejectedValue(
      new Error("Permission denied (publickey)")
    );
    const options = {
      projectPath: "/tmp/test-project",
      branch: "feature/test",
    };

    // Act & Assert
    await expect(pushToRemote(options)).rejects.toThrow("Permission denied");
  });

  it("handles remote not found error", async () => {
    // Arrange
    mockGit.push.mockRejectedValue(new Error("fatal: 'upstream' does not appear to be a git repository"));
    const options = {
      projectPath: "/tmp/test-project",
      branch: "main",
      remote: "upstream",
    };

    // Act & Assert
    await expect(pushToRemote(options)).rejects.toThrow(
      "does not appear to be a git repository"
    );
  });

  it("handles empty branch name", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      branch: "",
    };

    // Act
    await pushToRemote(options);

    // Assert
    expect(mockGit.push).toHaveBeenCalledWith("origin", "", [
      "--set-upstream",
    ]);
  });

  it("handles special characters in branch name", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      branch: "feature/issue-#123",
    };

    // Act
    await pushToRemote(options);

    // Assert
    expect(mockGit.push).toHaveBeenCalledWith("origin", "feature/issue-#123", [
      "--set-upstream",
    ]);
  });

  it("always includes --set-upstream flag", async () => {
    // Arrange
    const options = {
      projectPath: "/tmp/test-project",
      branch: "test",
    };

    // Act
    await pushToRemote(options);

    // Assert
    const pushCall = mockGit.push.mock.calls[0];
    expect(pushCall[2]).toContain("--set-upstream");
  });

  it("handles timeout error", async () => {
    // Arrange
    mockGit.push.mockRejectedValue(
      new Error("Connection timed out after 60 seconds")
    );
    const options = {
      projectPath: "/tmp/test-project",
      branch: "feature/test",
    };

    // Act & Assert
    await expect(pushToRemote(options)).rejects.toThrow("timed out");
  });

  it("handles large repository push", async () => {
    // Arrange
    mockGit.push.mockResolvedValue(undefined);
    const options = {
      projectPath: "/tmp/large-project",
      branch: "main",
    };

    // Act
    await pushToRemote(options);

    // Assert
    expect(mockGit.push).toHaveBeenCalledWith("origin", "main", [
      "--set-upstream",
    ]);
  });
});
