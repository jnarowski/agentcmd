import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createSetupWorkspaceStep } from "./createSetupWorkspaceStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type {
  SetupWorkspaceConfig,
} from "agentcmd-workflows";

// Mock simple-git for auto-commit in worktree mode
const mockGitStatus = vi.fn();
const mockGitAdd = vi.fn();
const mockGitCommit = vi.fn();

vi.mock("simple-git", () => ({
  default: vi.fn(() => ({
    status: mockGitStatus,
    add: mockGitAdd,
    commit: mockGitCommit,
  })),
}));

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

vi.mock("./utils/createWorkflowEventCommand", () => ({
  createWorkflowEventCommand: vi.fn(),
}));

// Mock executeStep to just run the fn directly (bypass Prisma)
vi.mock("./utils/executeStep", () => ({
  executeStep: vi.fn(async (params: { fn: () => Promise<unknown> }) => {
    const result = await params.fn();
    return { runStepId: "mock-step-id", result };
  }),
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

    // Default: no uncommitted changes
    mockGitStatus.mockResolvedValue({ files: [] });
    mockGitAdd.mockResolvedValue(undefined);
    mockGitCommit.mockResolvedValue(undefined);

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
        worktreePath: "/test/project/.worktrees/feature-wt",
      });
      expect(result).toEqual({
        workingDir: "/test/project/.worktrees/feat/new",
        branch: "feat/new",
        mode: "worktree",
        worktreePath: "/test/project/.worktrees/feat/new",
        worktreeName: "feature-wt",
        originalBranch: "main",
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
        worktreePath: "/test/project/.worktrees/current-wt",
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
        worktreePath: "/test/project/.worktrees/main-wt",
      });
      expect(result.branch).toBe("main");
    });

    it("auto-commits uncommitted changes before creating worktree", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        worktreeName: "feature-wt",
        branch: "feat/new",
      };

      // Simulate uncommitted changes
      mockGitStatus.mockResolvedValue({
        files: [{ path: "src/index.ts", index: "M" }],
      });

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createWorktree).mockResolvedValue("/test/project/.worktrees/feat/new");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await setupWorkspace("setup-workspace", config);

      // Should check status, add, and commit
      expect(mockGitStatus).toHaveBeenCalled();
      expect(mockGitAdd).toHaveBeenCalledWith(".");
      expect(mockGitCommit).toHaveBeenCalledWith(
        'Auto-commit before creating worktree "feature-wt"'
      );
      // Then create worktree
      expect(createWorktree).toHaveBeenCalled();
    });

    it("skips auto-commit when no uncommitted changes", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        worktreeName: "clean-wt",
        branch: "feat/clean",
      };

      // No uncommitted changes
      mockGitStatus.mockResolvedValue({ files: [] });

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createWorktree).mockResolvedValue("/test/project/.worktrees/feat/clean");

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await setupWorkspace("setup-workspace", config);

      // Should check status but NOT commit
      expect(mockGitStatus).toHaveBeenCalled();
      expect(mockGitAdd).not.toHaveBeenCalled();
      expect(mockGitCommit).not.toHaveBeenCalled();
      // Still create worktree
      expect(createWorktree).toHaveBeenCalled();
    });
  });

  describe("MODE 2: Branch switching", () => {
    it("switches to branch when different from current", async () => {
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/new",
        baseBranch: "main",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createAndSwitchBranch).mockResolvedValue({
        branch: { name: "feat/new", current: true },
        commands: ["git checkout -b feat/new"],
      });

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      const result = await setupWorkspace("setup-workspace", config);

      // getGitStatus and commitChanges are now handled internally by createAndSwitchBranch
      expect(getGitStatus).not.toHaveBeenCalled();
      expect(commitChanges).not.toHaveBeenCalled();
      expect(createAndSwitchBranch).toHaveBeenCalledWith({
        projectPath: "/test/project",
        branchName: "feat/new",
        from: "main",
      });
      expect(result).toEqual({
        workingDir: "/test/project",
        branch: "feat/new",
        mode: "branch",
        originalBranch: "main",
      });
    });

    it("delegates uncommitted changes handling to createAndSwitchBranch", async () => {
      // createAndSwitchBranch now handles uncommitted changes internally
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/dirty",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createAndSwitchBranch).mockResolvedValue({
        branch: { name: "feat/dirty", current: true },
        commands: [
          'git add . && git commit -m "Auto-commit before switching to branch \\"feat/dirty\\""',
          "git checkout -b feat/dirty",
        ],
      });

      const setupWorkspace = createSetupWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await setupWorkspace("setup-workspace", config);

      // commitChanges is now handled internally by createAndSwitchBranch
      expect(commitChanges).not.toHaveBeenCalled();
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
      vi.mocked(createAndSwitchBranch).mockResolvedValue({
        branch: { name: "feat/based-on-dev", current: true },
        commands: ["git checkout -b feat/based-on-dev develop"],
      });

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
    it("wraps worktree creation in executeStep for idempotency", async () => {
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
      await setupWorkspace("setup-workspace", config);

      // Worktree mode uses executeStep (which is mocked)
      expect(createWorktree).toHaveBeenCalled();
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

    it("propagates commit errors from createAndSwitchBranch", async () => {
      // Since commitChanges is now handled internally by createAndSwitchBranch,
      // commit errors bubble up from there
      const config: SetupWorkspaceConfig = {
        projectPath: "/test/project",
        branch: "feat/commit-fail",
      };

      vi.mocked(getCurrentBranch).mockResolvedValue("main");
      vi.mocked(createAndSwitchBranch).mockRejectedValue(
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
      vi.mocked(createAndSwitchBranch).mockResolvedValue({
        branch: { name: "feat/new", current: true },
        commands: ["git checkout -b feat/new"],
      });

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
      vi.mocked(createAndSwitchBranch).mockResolvedValue({
        branch: { name: "feat/new", current: true },
        commands: ["git checkout -b feat/new"],
      });

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
