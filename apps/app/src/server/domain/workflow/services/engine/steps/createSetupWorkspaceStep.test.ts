import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createSetupWorkspaceStep } from "./createSetupWorkspaceStep";
import type { RuntimeContext } from "../../../types/engine.types";
import type {
  SetupWorkspaceConfig,
} from "agentcmd-workflows";

// Mock all git service dependencies
vi.mock("@/server/domain/git/services/getCurrentBranch", () => ({
  getCurrentBranch: vi.fn(),
}));

vi.mock("@/server/domain/git/services/commitChanges", () => ({
  commitChanges: vi.fn(),
}));

vi.mock("@/server/domain/git/services/createAndSwitchBranch", () => ({
  createAndSwitchBranch: vi.fn(),
}));

vi.mock("@/server/domain/git/services/createWorktree", () => ({
  createWorktree: vi.fn(),
}));

vi.mock("@/server/domain/git/services/getGitStatus", () => ({
  getGitStatus: vi.fn(),
}));

// Import mocked functions
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { createAndSwitchBranch } from "@/server/domain/git/services/createAndSwitchBranch";
import { createWorktree } from "@/server/domain/git/services/createWorktree";
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";

describe("createSetupWorkspaceStep", () => {
  let mockContext: RuntimeContext;
  let mockInngestStep: {
    run: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      workflowId: "test-workflow-id",
      runId: "test-run-id",
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      currentPhase: null,
      currentStepNumber: 1,
    } as unknown as RuntimeContext;

    // Mock Inngest step.run to execute the callback immediately
    mockInngestStep = {
      run: vi.fn(async (_id: string, callback: () => Promise<unknown>) => {
        return await callback();
      }),
    };
  });

  describe("MODE 1: Worktree", () => {
    it("creates worktree when worktreeName provided", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        worktreeName: "feature-wt",
        branch: "feat/new",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createWorktree).mockResolvedValue("/test/project/.worktrees/feat/new");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(createWorktree).toHaveBeenCalledWith({
        projectPath: "/test/project",
        branch: "feat/new",
      });
      expect(result).toEqual({
        workingDir: "/test/project/.worktrees/feat/new",
        branch: "feat/new",
        mode: "worktree",
        worktreePath: "/test/project/.worktrees/feat/new",
      });
    });

    it("uses current branch as target when no branch specified", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        worktreeName: "current-wt",
        // No branch specified
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("develop");
      vi.mocked(createWorktree).mockResolvedValue("/test/project/.worktrees/develop");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(createWorktree).toHaveBeenCalledWith({
        projectPath: "/test/project",
        branch: "develop", // Uses current branch
      });
      expect(result.branch).toBe("develop");
    });

    it("defaults to main when current branch is null", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        worktreeName: "main-wt",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue(null);
      vi.mocked(createWorktree).mockResolvedValue("/test/project/.worktrees/main");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(createWorktree).toHaveBeenCalledWith({
        projectPath: "/test/project",
        branch: "main", // Defaults to main
      });
      expect(result.branch).toBe("main");
    });
  });

  describe("MODE 2: Branch switching", () => {
    it("switches to branch when different from current and no uncommitted changes", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/new",
        baseBranch: "main",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(createAndSwitchBranch).mockResolvedValue();

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(getGitStatus).toHaveBeenCalledWith({ projectPath: "/test/project" });
      expect(commitChanges).not.toHaveBeenCalled(); // No uncommitted changes
      expect(createAndSwitchBranch).toHaveBeenCalledWith({
        projectPath: "/test/project",
        branchName: "feat/new",
        from: "main",
      });
      expect(result).toEqual({
        workingDir: "/test/project",
        branch: "feat/new",
        mode: "branch",
      });
    });

    it("auto-commits uncommitted changes before branch switch", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/dirty",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(getGitStatus).mockResolvedValue({
        files: [
          { path: "file1.ts", status: "modified" },
          { path: "file2.ts", status: "added" },
        ],
      });
      vi.mocked(commitChanges).mockResolvedValue();
      vi.mocked(createAndSwitchBranch).mockResolvedValue();

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await setupWorkspace("setup-workspace", config);

      expect(commitChanges).toHaveBeenCalledWith({
        projectPath: "/test/project",
        message: "WIP: Auto-commit before branching",
        files: ["."],
      });
      expect(createAndSwitchBranch).toHaveBeenCalled();
    });

    it("skips branch switch when target equals current branch", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "main",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(getGitStatus).not.toHaveBeenCalled();
      expect(createAndSwitchBranch).not.toHaveBeenCalled();
      expect(result).toEqual({
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      });
    });

    it("handles baseBranch parameter correctly", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/based-on-dev",
        baseBranch: "develop",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(createAndSwitchBranch).mockResolvedValue();

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await setupWorkspace("setup-workspace", config);

      expect(createAndSwitchBranch).toHaveBeenCalledWith({
        projectPath: "/test/project",
        branchName: "feat/based-on-dev",
        from: "develop", // Uses baseBranch
      });
    });
  });

  describe("MODE 3: Stay on current branch", () => {
    it("stays on current branch when no worktree or branch specified", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        // No worktreeName or branch
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("develop");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(createWorktree).not.toHaveBeenCalled();
      expect(getGitStatus).not.toHaveBeenCalled();
      expect(createAndSwitchBranch).not.toHaveBeenCalled();
      expect(result).toEqual({
        workingDir: "/test/project",
        branch: "develop",
        mode: "stay",
      });
    });

    it("defaults to main when current branch is null", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue(null);

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(result.branch).toBe("main");
    });
  });

  describe("Inngest integration", () => {
    it("generates correct step ID with phase prefix", async () => {
      mockContext.currentPhase = "setup";

      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await setupWorkspace("workspace-init", config);

      expect(mockInngestStep.run).toHaveBeenCalledWith(
        "setup-workspace-init", // Phase prefix added
        expect.any(Function)
      );
    });

    it("uses raw ID when no phase", async () => {
      mockContext.currentPhase = null;

      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await setupWorkspace("workspace-init", config);

      expect(mockInngestStep.run).toHaveBeenCalledWith(
        "workspace-init", // No prefix
        expect.any(Function)
      );
    });

    it("applies custom timeout", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");

      // Mock a slow operation
      vi.mocked(getCurrentBranch).mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve("main"), 200))
      );

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      // Short timeout should cause failure
      await expect(
        setupWorkspace("workspace-init", config, { timeout: 50 })
      ).rejects.toThrow("Setup workspace timed out after 50ms");
    });

    it("uses default timeout when not specified", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      // Should not timeout with default (120s)
      await expect(
        setupWorkspace("workspace-init", config)
      ).resolves.toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("propagates errors from createWorktree", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        worktreeName: "failing-wt",
        branch: "main",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createWorktree).mockRejectedValue(
        new Error("Failed to create worktree: permission denied")
      );

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      await expect(
        setupWorkspace("setup-workspace", config)
      ).rejects.toThrow("Failed to create worktree: permission denied");
    });

    it("propagates errors from createAndSwitchBranch", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/fail",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(createAndSwitchBranch).mockRejectedValue(
        new Error("Branch already exists")
      );

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      await expect(
        setupWorkspace("setup-workspace", config)
      ).rejects.toThrow("Branch already exists");
    });

    it("propagates errors from commitChanges", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/commit-fail",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockRejectedValue(
        new Error("Nothing to commit")
      );

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      await expect(
        setupWorkspace("setup-workspace", config)
      ).rejects.toThrow("Nothing to commit");
    });

    it("propagates errors from getCurrentBranch", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/invalid/path",
      };

      vi.mocked(getCurrentBranch).mockRejectedValue(
        new Error("Not a git repository")
      );

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      await expect(
        setupWorkspace("setup-workspace", config)
      ).rejects.toThrow("Not a git repository");
    });
  });

  describe("Decision tree priority", () => {
    it("prioritizes worktree over branch when both provided", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        worktreeName: "wt1", // Worktree takes priority
        branch: "feat/new",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createWorktree).mockResolvedValue("/test/project/.worktrees/feat/new");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(result.mode).toBe("worktree");
      expect(createWorktree).toHaveBeenCalled();
      expect(createAndSwitchBranch).not.toHaveBeenCalled();
    });

    it("falls back to branch mode when worktree not specified", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        // No worktreeName
        branch: "feat/new",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(createAndSwitchBranch).mockResolvedValue();

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(result.mode).toBe("branch");
      expect(createWorktree).not.toHaveBeenCalled();
      expect(createAndSwitchBranch).toHaveBeenCalled();
    });

    it("falls back to stay mode when neither specified", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        // No worktreeName or branch
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("develop");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(result.mode).toBe("stay");
      expect(createWorktree).not.toHaveBeenCalled();
      expect(createAndSwitchBranch).not.toHaveBeenCalled();
    });
  });

  describe("Result structure validation", () => {
    it("returns correct structure for worktree mode", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        worktreeName: "wt",
        branch: "main",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createWorktree).mockResolvedValue("/test/project/.worktrees/main");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(result).toMatchObject({
        workingDir: expect.any(String),
        branch: expect.any(String),
        mode: "worktree",
        worktreePath: expect.any(String),
      });
    });

    it("returns correct structure for branch mode", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/new",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(createAndSwitchBranch).mockResolvedValue();

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(result).toMatchObject({
        workingDir: expect.any(String),
        branch: expect.any(String),
        mode: "branch",
      });
      expect(result).not.toHaveProperty("worktreePath");
    });

    it("returns correct structure for stay mode", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      expect(result).toMatchObject({
        workingDir: expect.any(String),
        branch: expect.any(String),
        mode: "stay",
      });
      expect(result).not.toHaveProperty("worktreePath");
    });
  });
});
