import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import simpleGit, {
  type SimpleGit,
  type StatusResult,
  type BranchSummary,
  type LogResult,
} from "simple-git";
import { exec } from "child_process";
import {
  getGitStatus,
  getBranches,
  createAndSwitchBranch,
  switchBranch,
  stageFiles,
  unstageFiles,
  commitChanges,
  pushToRemote,
  fetchFromRemote,
  getFileDiff,
  getCommitHistory,
  getCommitsSinceBase,
  checkGhCliAvailable,
} from "@/server/domain/git/services";

// Mock simple-git
vi.mock("simple-git");

// Mock child_process
vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

describe("Git Service", () => {
  let mockGit: Partial<SimpleGit>;
  let mockSimpleGit: MockedFunction<typeof simpleGit>;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock git instance
    mockGit = {
      checkIsRepo: vi.fn(),
      status: vi.fn(),
      branch: vi.fn(),
      checkoutLocalBranch: vi.fn(),
      checkout: vi.fn(),
      add: vi.fn(),
      reset: vi.fn(),
      commit: vi.fn(),
      push: vi.fn(),
      fetch: vi.fn(),
      diff: vi.fn(),
      log: vi.fn(),
      show: vi.fn(),
      raw: vi.fn(),
    };

    // Mock simpleGit to return our mock instance
    mockSimpleGit = simpleGit as MockedFunction<typeof simpleGit>;
    mockSimpleGit.mockReturnValue(mockGit as SimpleGit);
  });

  describe("getGitStatus", () => {
    it("should return git status with files", async () => {
      const mockStatus = {
        current: "main",
        staged: ["file1.txt"],
        modified: ["file2.txt"],
        created: [],
        deleted: [],
        not_added: ["file3.txt"],
        renamed: [],
        ahead: 2,
        behind: 1,
      } as StatusResult;

      (
        mockGit.checkIsRepo as MockedFunction<() => Promise<boolean>>
      ).mockResolvedValue(true);
      (
        mockGit.status as MockedFunction<() => Promise<StatusResult>>
      ).mockResolvedValue(mockStatus);

      const result = await getGitStatus("/test/path");

      expect(result.branch).toBe("main");
      expect(result.isRepo).toBe(true);
      expect(result.ahead).toBe(2);
      expect(result.behind).toBe(1);
      expect(result.files).toHaveLength(3);
      expect(result.files[0]).toEqual({
        path: "file1.txt",
        status: "M",
        staged: true,
      });
      expect(result.files[1]).toEqual({
        path: "file2.txt",
        status: "M",
        staged: false,
      });
      expect(result.files[2]).toEqual({
        path: "file3.txt",
        status: "??",
        staged: false,
      });
    });

    it("should handle non-repo gracefully", async () => {
      (
        mockGit.checkIsRepo as MockedFunction<() => Promise<boolean>>
      ).mockResolvedValue(false);

      const result = await getGitStatus("/test/path");

      expect(result.isRepo).toBe(false);
      expect(result.files).toEqual([]);
    });

    it("should handle errors and throw", async () => {
      (
        mockGit.checkIsRepo as MockedFunction<() => Promise<boolean>>
      ).mockRejectedValue(new Error("Git error"));

      await expect(getGitStatus("/test/path")).rejects.toThrow("Git error");
    });
  });

  describe("getBranches", () => {
    it("should return list of branches with current marked", async () => {
      const mockBranchSummary = {
        all: ["main", "feature/test", "develop"],
        current: "main",
        branches: {
          main: { current: true, name: "main" },
          "feature/test": { current: false, name: "feature/test" },
          develop: { current: false, name: "develop" },
        },
      };

      (
        mockGit.branch as MockedFunction<() => Promise<BranchSummary>>
      ).mockResolvedValue(mockBranchSummary);

      const result = await getBranches("/test/path");

      expect(result).toHaveLength(3);
      // Results are sorted alphabetically
      expect(result[0]).toEqual({ name: "develop", current: false });
      expect(result[1]).toEqual({ name: "feature/test", current: false });
      expect(result[2]).toEqual({ name: "main", current: true });
    });

    it("should handle errors", async () => {
      (
        mockGit.branch as MockedFunction<() => Promise<BranchSummary>>
      ).mockRejectedValue(new Error("Branch error"));

      await expect(getBranches("/test/path")).rejects.toThrow("Branch error");
    });
  });

  describe("createAndSwitchBranch", () => {
    it("should create and switch to new branch", async () => {
      // Mock status to indicate no uncommitted changes
      (
        mockGit.status as MockedFunction<() => Promise<StatusResult>>
      ).mockResolvedValue({
        files: [],
      } as StatusResult);
      (
        mockGit.checkoutLocalBranch as MockedFunction<
          (name: string) => Promise<void>
        >
      ).mockResolvedValue();

      const result = await createAndSwitchBranch({ projectPath: "/test/path", branchName: "feature/new" });

      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith("feature/new");
      expect(result).toEqual({ name: "feature/new", current: true });
    });

    it("should create branch from specific base", async () => {
      // Mock status to indicate no uncommitted changes
      (
        mockGit.status as MockedFunction<() => Promise<StatusResult>>
      ).mockResolvedValue({
        files: [],
      } as StatusResult);
      (
        mockGit.checkout as MockedFunction<(branch: string) => Promise<void>>
      ).mockResolvedValue();
      (
        mockGit.checkoutLocalBranch as MockedFunction<
          (name: string) => Promise<void>
        >
      ).mockResolvedValue();

      const result = await createAndSwitchBranch({
        projectPath: "/test/path",
        branchName: "feature/new",
        from: "develop"
      });

      expect(mockGit.checkout).toHaveBeenCalledWith("develop");
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith("feature/new");
      expect(result).toEqual({ name: "feature/new", current: true });
    });

    it("should reject invalid branch names", async () => {
      await expect(
        createAndSwitchBranch({ projectPath: "/test/path", branchName: "invalid name" })
      ).rejects.toThrow("Invalid branch name");
      await expect(
        createAndSwitchBranch({ projectPath: "/test/path", branchName: "invalid@name" })
      ).rejects.toThrow("Invalid branch name");
    });
  });

  describe("switchBranch", () => {
    it("should switch to existing branch", async () => {
      (
        mockGit.checkout as MockedFunction<(branch: string) => Promise<void>>
      ).mockResolvedValue();

      const result = await switchBranch({ projectPath: "/test/path", branchName: "develop" });

      expect(mockGit.checkout).toHaveBeenCalledWith("develop");
      expect(result).toEqual({ name: "develop", current: true });
    });

    it("should handle checkout errors", async () => {
      (
        mockGit.checkout as MockedFunction<(branch: string) => Promise<void>>
      ).mockRejectedValue(new Error("Branch does not exist"));

      await expect(switchBranch({ projectPath: "/test/path", branchName: "nonexistent" })).rejects.toThrow(
        "Branch does not exist"
      );
    });
  });

  describe("stageFiles", () => {
    it("should stage multiple files", async () => {
      (
        mockGit.add as MockedFunction<(files: string[]) => Promise<void>>
      ).mockResolvedValue();

      await stageFiles({ projectPath: "/test/path", files: ["file1.txt", "file2.txt"] });

      expect(mockGit.add).toHaveBeenCalledWith(["file1.txt", "file2.txt"]);
    });

    it("should handle staging errors", async () => {
      (
        mockGit.add as MockedFunction<(files: string[]) => Promise<void>>
      ).mockRejectedValue(new Error("Stage error"));

      await expect(stageFiles({ projectPath: "/test/path", files: ["file1.txt"] })).rejects.toThrow(
        "Stage error"
      );
    });
  });

  describe("unstageFiles", () => {
    it("should unstage multiple files", async () => {
      (
        mockGit.reset as MockedFunction<(args: string[]) => Promise<void>>
      ).mockResolvedValue();

      await unstageFiles({ projectPath: "/test/path", files: ["file1.txt", "file2.txt"] });

      expect(mockGit.reset).toHaveBeenCalledWith([
        "HEAD",
        "file1.txt",
        "file2.txt",
      ]);
    });

    it("should handle unstaging errors", async () => {
      (
        mockGit.reset as MockedFunction<(args: string[]) => Promise<void>>
      ).mockRejectedValue(new Error("Unstage error"));

      await expect(unstageFiles({ projectPath: "/test/path", files: ["file1.txt"] })).rejects.toThrow(
        "Unstage error"
      );
    });
  });

  describe("commitChanges", () => {
    it("should commit staged files", async () => {
      const mockCommitResult = { commit: "abc123" };
      (
        mockGit.add as MockedFunction<(files: string[]) => Promise<void>>
      ).mockResolvedValue();
      (
        mockGit.commit as MockedFunction<
          (message: string) => Promise<{ commit: string }>
        >
      ).mockResolvedValue(mockCommitResult);

      const result = await commitChanges({
        projectPath: "/test/path",
        message: "Test commit",
        files: ["file1.txt"]
      });

      expect(mockGit.add).toHaveBeenCalledWith(["file1.txt"]);
      expect(mockGit.commit).toHaveBeenCalledWith("Test commit");
      expect(result).toBe("abc123");
    });

    it("should handle commit errors", async () => {
      (
        mockGit.commit as MockedFunction<
          (message: string, files?: string[]) => Promise<{ commit: string }>
        >
      ).mockRejectedValue(new Error("Commit error"));

      await expect(
        commitChanges({ projectPath: "/test/path", message: "Test", files: ["file1.txt"] })
      ).rejects.toThrow("Commit error");
    });
  });

  describe("pushToRemote", () => {
    it("should push to remote with default origin", async () => {
      (
        mockGit.push as MockedFunction<
          (remote: string, branch: string, options?: string[]) => Promise<void>
        >
      ).mockResolvedValue();

      await pushToRemote({ projectPath: "/test/path", branch: "main" });

      expect(mockGit.push).toHaveBeenCalledWith("origin", "main", [
        "--set-upstream",
      ]);
    });

    it("should push to custom remote", async () => {
      (
        mockGit.push as MockedFunction<
          (remote: string, branch: string, options?: string[]) => Promise<void>
        >
      ).mockResolvedValue();

      await pushToRemote({ projectPath: "/test/path", branch: "main", remote: "upstream" });

      expect(mockGit.push).toHaveBeenCalledWith("upstream", "main", [
        "--set-upstream",
      ]);
    });

    it("should handle push errors", async () => {
      (
        mockGit.push as MockedFunction<
          (remote: string, branch: string) => Promise<void>
        >
      ).mockRejectedValue(new Error("Push rejected"));

      await expect(pushToRemote({ projectPath: "/test/path", branch: "main" })).rejects.toThrow(
        "Push rejected"
      );
    });
  });

  describe("fetchFromRemote", () => {
    it("should fetch from default origin", async () => {
      (
        mockGit.fetch as MockedFunction<(remote: string) => Promise<void>>
      ).mockResolvedValue();

      await fetchFromRemote({ projectPath: "/test/path" });

      expect(mockGit.fetch).toHaveBeenCalledWith("origin");
    });

    it("should fetch from custom remote", async () => {
      (
        mockGit.fetch as MockedFunction<(remote: string) => Promise<void>>
      ).mockResolvedValue();

      await fetchFromRemote({ projectPath: "/test/path", remote: "upstream" });

      expect(mockGit.fetch).toHaveBeenCalledWith("upstream");
    });

    it("should handle fetch errors", async () => {
      (
        mockGit.fetch as MockedFunction<(remote: string) => Promise<void>>
      ).mockRejectedValue(new Error("Fetch error"));

      await expect(fetchFromRemote({ projectPath: "/test/path" })).rejects.toThrow(
        "Fetch error"
      );
    });
  });

  describe("getFileDiff", () => {
    it("should return file diff", async () => {
      const mockDiff = "+++ added line\n--- removed line";
      (
        mockGit.diff as MockedFunction<(args: string[]) => Promise<string>>
      ).mockResolvedValue(mockDiff);

      const result = await getFileDiff({ projectPath: "/test/path", filepath: "file1.txt" });

      expect(mockGit.diff).toHaveBeenCalledWith(["--text", "--", "file1.txt"]);
      expect(result).toBe(mockDiff);
    });

    it("should handle diff errors", async () => {
      (
        mockGit.diff as MockedFunction<(args: string[]) => Promise<string>>
      ).mockRejectedValue(new Error("Diff error"));

      await expect(getFileDiff({ projectPath: "/test/path", filepath: "file1.txt" })).rejects.toThrow(
        "Diff error"
      );
    });
  });

  describe("getCommitHistory", () => {
    it("should return commit history with default limit", async () => {
      const mockLog = {
        all: [
          {
            hash: "abc1234567",
            message: "Test commit",
            author_name: "John Doe",
            author_email: "john@example.com",
            date: "2024-01-01T10:00:00Z",
          },
        ],
      };
      (
        mockGit.log as MockedFunction<
          (options: { maxCount?: number; from?: string }) => Promise<LogResult>
        >
      ).mockResolvedValue(mockLog);

      const result = await getCommitHistory({ projectPath: "/test/path" });

      expect(mockGit.log).toHaveBeenCalledWith({
        maxCount: 100,
        from: undefined,
      });
      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe("abc1234567");
      expect(result[0].shortHash).toBe("abc1234");
      expect(result[0].message).toBe("Test commit");
      expect(result[0].author).toBe("John Doe");
    });

    it("should handle custom limit and offset", async () => {
      const mockLog = { all: [] };
      (
        mockGit.log as MockedFunction<
          (options: { maxCount?: number; from?: string }) => Promise<LogResult>
        >
      ).mockResolvedValue(mockLog);

      await getCommitHistory({ projectPath: "/test/path", limit: 50, offset: 10 });

      expect(mockGit.log).toHaveBeenCalledWith({
        maxCount: 50,
        from: "HEAD~10",
      });
    });
  });

  describe("checkGhCliAvailable", () => {
    it("should return true if gh CLI is available", async () => {
      const mockExec = exec as unknown as MockedFunction<typeof exec>;
      mockExec.mockImplementation(((
        cmd: string,
        options: unknown,
        callback: (error: null, result: { stdout: string }) => void
      ) => {
        callback(null, { stdout: "Logged in" });
      }) as typeof exec);

      const result = await checkGhCliAvailable("/test/path");

      expect(result).toBe(true);
    });

    it("should return false if gh CLI is not available", async () => {
      const mockExec = exec as unknown as MockedFunction<typeof exec>;
      mockExec.mockImplementation(((
        cmd: string,
        options: unknown,
        callback: (error: Error) => void
      ) => {
        callback(new Error("Command not found"));
      }) as typeof exec);

      const result = await checkGhCliAvailable("/test/path");

      expect(result).toBe(false);
    });
  });

  describe("getCommitsSinceBase", () => {
    it("should return commits since base branch", async () => {
      const mockLog = {
        all: [
          {
            hash: "abc123",
            message: "Feature commit",
            author_name: "Jane Doe",
            author_email: "jane@example.com",
            date: "2024-01-02T10:00:00Z",
          },
        ],
      };
      (
        mockGit.log as MockedFunction<(args: string[]) => Promise<LogResult>>
      ).mockResolvedValue(mockLog);

      const result = await getCommitsSinceBase("/test/path", "main");

      expect(mockGit.log).toHaveBeenCalledWith(["main..HEAD"]);
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe("Feature commit");
    });
  });
});
