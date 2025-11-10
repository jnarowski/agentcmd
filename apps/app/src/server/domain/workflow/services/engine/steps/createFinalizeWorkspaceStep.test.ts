import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createFinalizeWorkspaceStep } from "./createFinalizeWorkspaceStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { CleanupWorkspaceConfig, WorkspaceResult } from "agentcmd-workflows";

// Mock all git service dependencies
vi.mock("@/server/domain/git/services/getGitStatus", () => ({
  getGitStatus: vi.fn(),
}));

vi.mock("@/server/domain/git/services/commitChanges", () => ({
  commitChanges: vi.fn(),
}));

vi.mock("@/server/domain/git/services/switchBranch", () => ({
  switchBranch: vi.fn(),
}));

vi.mock("@/server/domain/git/services/removeWorktree", () => ({
  removeWorktree: vi.fn(),
}));

vi.mock("./utils/createWorkflowEventCommand", () => ({
  createWorkflowEventCommand: vi.fn(),
}));

vi.mock("@/shared/prisma", () => ({
  prisma: {
    workflowRun: {
      findUnique: vi.fn(),
    },
  },
}));

// Import mocked functions
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { switchBranch } from "@/server/domain/git/services/switchBranch";
import { removeWorktree } from "@/server/domain/git/services/removeWorktree";
import { prisma } from "@/shared/prisma";

describe("createFinalizeWorkspaceStep", () => {
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

    // Mock prisma to return workflow run with name
    vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue({
      id: "test-run-id",
      name: "Test Workflow Run",
      project_id: "test-project-id",
      user_id: "test-user-id",
      workflow_definition_id: "test-definition-id",
      args: {},
      spec_file: null,
      spec_content: null,
      mode: null,
      branch_name: null,
      base_branch: null,
      current_phase: null,
      current_step_index: 0,
      status: "running",
      error_message: null,
      inngest_run_id: null,
      started_at: new Date(),
      completed_at: null,
      paused_at: null,
      cancelled_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  describe("Auto-commit behavior", () => {
    it("commits changes when present", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "feat/test",
        mode: "branch",
        originalBranch: "main",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [
          { path: "file1.ts", status: "modified" },
          { path: "file2.ts", status: "added" },
        ],
      });
      vi.mocked(commitChanges).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(getGitStatus).toHaveBeenCalledWith({
        projectPath: "/test/project",
      });
      expect(commitChanges).toHaveBeenCalledWith({
        projectPath: "/test/project",
        message: "wip: Workflow 'Test Workflow Run' auto-commit",
        files: ["."],
      });
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        { workingDir: "/test/project", fileCount: 2 },
        "Auto-committing changes..."
      );
    });

    it("skips commit when no changes", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [],
      });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(getGitStatus).toHaveBeenCalledWith({
        projectPath: "/test/project",
      });
      expect(commitChanges).not.toHaveBeenCalled();
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        { workingDir: "/test/project" },
        "No changes to commit"
      );
    });

    it("uses workflow name in commit message", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue({
        id: "test-run-id",
        name: "Feature Implementation - API v2",
        project_id: "test-project-id",
        user_id: "test-user-id",
        workflow_definition_id: "test-definition-id",
        args: {},
        spec_file: null,
        spec_content: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        current_phase: null,
        current_step_index: 0,
        status: "running",
        error_message: null,
        inngest_run_id: null,
        started_at: new Date(),
        completed_at: null,
        paused_at: null,
        cancelled_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalledWith({
        projectPath: "/test/project",
        message: "wip: Workflow 'Feature Implementation - API v2' auto-commit",
        files: ["."],
      });
    });

    it("defaults to 'Workflow' when run name not found", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue(null);

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalledWith({
        projectPath: "/test/project",
        message: "wip: Workflow 'Workflow' auto-commit",
        files: ["."],
      });
    });
  });

  describe("MODE 1: Stay mode", () => {
    it("only commits changes without checkout", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalled();
      expect(switchBranch).not.toHaveBeenCalled();
      expect(removeWorktree).not.toHaveBeenCalled();
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        { mode: "stay" },
        "Finalized in stay mode"
      );
    });
  });

  describe("MODE 2: Branch mode", () => {
    it("commits and restores original branch", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "feat/new",
        mode: "branch",
        originalBranch: "main",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue();
      vi.mocked(switchBranch).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalled();
      expect(switchBranch).toHaveBeenCalledWith({
        projectPath: "/test/project",
        branchName: "main",
      });
      expect(removeWorktree).not.toHaveBeenCalled();
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        { originalBranch: "main" },
        "Restored original branch"
      );
    });

    it("skips checkout when originalBranch not provided", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "feat/new",
        mode: "branch",
        // No originalBranch
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(switchBranch).not.toHaveBeenCalled();
    });
  });

  describe("MODE 3: Worktree mode", () => {
    it("commits, removes worktree, and restores original branch", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project/.worktrees/run-123-feat",
        branch: "feat/new",
        mode: "worktree",
        worktreePath: "/test/project/.worktrees/run-123-feat",
        originalBranch: "main",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue();
      vi.mocked(removeWorktree).mockResolvedValue();
      vi.mocked(switchBranch).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalledWith({
        projectPath: "/test/project/.worktrees/run-123-feat",
        message: "wip: Workflow 'Test Workflow Run' auto-commit",
        files: ["."],
      });
      expect(removeWorktree).toHaveBeenCalledWith({
        projectPath: "/test/project",
        worktreePath: "/test/project/.worktrees/run-123-feat",
      });
      expect(switchBranch).toHaveBeenCalledWith({
        projectPath: "/test/project",
        branchName: "main",
      });
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        { originalBranch: "main", worktreePath: "/test/project/.worktrees/run-123-feat" },
        "Removed worktree and restored original branch"
      );
    });

    it("handles worktree removal without originalBranch", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project/.worktrees/run-123-feat",
        branch: "feat/new",
        mode: "worktree",
        worktreePath: "/test/project/.worktrees/run-123-feat",
        // No originalBranch
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(removeWorktree).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(removeWorktree).toHaveBeenCalled();
      expect(switchBranch).not.toHaveBeenCalled(); // No originalBranch to restore
    });

    it("extracts project path from worktree path correctly", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/home/user/projects/myapp/.worktrees/run-abc-feature",
        branch: "feature",
        mode: "worktree",
        worktreePath: "/home/user/projects/myapp/.worktrees/run-abc-feature",
        originalBranch: "develop",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(removeWorktree).mockResolvedValue();
      vi.mocked(switchBranch).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(removeWorktree).toHaveBeenCalledWith({
        projectPath: "/home/user/projects/myapp",
        worktreePath: "/home/user/projects/myapp/.worktrees/run-abc-feature",
      });
      expect(switchBranch).toHaveBeenCalledWith({
        projectPath: "/home/user/projects/myapp",
        branchName: "develop",
      });
    });
  });

  describe("Error handling", () => {
    it("propagates errors from getGitStatus", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockRejectedValue(
        new Error("Not a git repository")
      );

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      await expect(
        finalizeWorkspace("finalize-workspace", config)
      ).rejects.toThrow("Not a git repository");
    });

    it("propagates errors from commitChanges", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockRejectedValue(
        new Error("Commit failed: permission denied")
      );

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      await expect(
        finalizeWorkspace("finalize-workspace", config)
      ).rejects.toThrow("Commit failed: permission denied");
    });

    it("propagates errors from switchBranch", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "feat/new",
        mode: "branch",
        originalBranch: "main",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(switchBranch).mockRejectedValue(
        new Error("Branch 'main' not found")
      );

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      await expect(
        finalizeWorkspace("finalize-workspace", config)
      ).rejects.toThrow("Branch 'main' not found");
    });

    it("propagates errors from removeWorktree", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project/.worktrees/run-123-feat",
        branch: "feat/new",
        mode: "worktree",
        worktreePath: "/test/project/.worktrees/run-123-feat",
        originalBranch: "main",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(removeWorktree).mockRejectedValue(
        new Error("Worktree removal failed: directory in use")
      );

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      await expect(
        finalizeWorkspace("finalize-workspace", config)
      ).rejects.toThrow("Worktree removal failed: directory in use");
    });
  });

  describe("Inngest integration", () => {
    it("generates correct step ID with phase prefix", async () => {
      mockContext.currentPhase = "cleanup";

      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("workspace-cleanup", config);

      expect(mockInngestStep.run).toHaveBeenCalledWith(
        "cleanup-workspace-cleanup", // Phase prefix added
        expect.any(Function)
      );
    });

    it("applies custom timeout", async () => {
      const workspaceResult: WorkspaceResult = {
        workingDir: "/test/project",
        branch: "main",
        mode: "stay",
      };

      const config: CleanupWorkspaceConfig = {
        workspaceResult,
      };

      // Mock a slow operation
      vi.mocked(getGitStatus).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ files: [] }), 200)
          )
      );

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );

      // Short timeout should cause failure
      await expect(
        finalizeWorkspace("workspace-cleanup", config, { timeout: 50 })
      ).rejects.toThrow("Finalize workspace timed out after 50ms");
    });
  });
});
