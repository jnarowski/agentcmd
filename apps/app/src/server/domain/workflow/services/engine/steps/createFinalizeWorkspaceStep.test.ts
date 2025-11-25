import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createFinalizeWorkspaceStep,
  type FinalizeWorkspaceConfig,
} from "./createFinalizeWorkspaceStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";

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

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true), // Default to true for tests
}));

// Import mocked functions
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { switchBranch } from "@/server/domain/git/services/switchBranch";
import { removeWorktree } from "@/server/domain/git/services/removeWorktree";

describe("createFinalizeWorkspaceStep", () => {
  let mockContext: RuntimeContext;
  let mockInngestStep: { run: Mock };

  const createConfig = (
    overrides: Partial<FinalizeWorkspaceConfig> = {}
  ): FinalizeWorkspaceConfig => ({
    mode: "stay",
    baseBranch: null,
    projectPath: "/test/project",
    workingDir: "/test/project",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      workflowId: "test-workflow-id",
      runId: "test-run-id",
      projectPath: "/test/project",
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

  describe("Auto-commit behavior", () => {
    it("commits changes when present", async () => {
      const config = createConfig({
        mode: "branch",
        baseBranch: "main",
        workflowName: "Test Workflow",
      });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [
          { path: "file1.ts", status: "modified" },
          { path: "file2.ts", status: "added" },
        ],
      });
      vi.mocked(commitChanges).mockResolvedValue({
        commitSha: "abc123",
        commands: ["git add . && git commit -m \"chore: Workflow 'Test Workflow' auto-commit\""],
      });

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
        message: "chore: Workflow 'Test Workflow' auto-commit",
      });
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        { workingDir: "/test/project", fileCount: 2 },
        "Auto-committing changes..."
      );
    });

    it("skips commit when no changes", async () => {
      const config = createConfig({ mode: "stay" });

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
      const config = createConfig({
        mode: "stay",
        workflowName: "Feature Implementation - API v2",
      });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue({
        commitSha: "abc123",
        commands: ["git add . && git commit -m \"chore: Workflow 'Test Workflow' auto-commit\""],
      });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalledWith({
        projectPath: "/test/project",
        message:
          "chore: Workflow 'Feature Implementation - API v2' auto-commit",
      });
    });

    it("defaults to 'Workflow' when name not provided", async () => {
      const config = createConfig({ mode: "stay" });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue({
        commitSha: "abc123",
        commands: ["git add . && git commit -m \"chore: Workflow 'Test Workflow' auto-commit\""],
      });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalledWith({
        projectPath: "/test/project",
        message: "chore: Workflow 'Workflow' auto-commit",
      });
    });
  });

  describe("MODE 1: Stay mode", () => {
    it("only commits changes without checkout", async () => {
      const config = createConfig({ mode: "stay" });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue({
        commitSha: "abc123",
        commands: ["git add . && git commit -m \"chore: Workflow 'Test Workflow' auto-commit\""],
      });

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
    it("commits and restores original branch by default (preserve: false)", async () => {
      const config = createConfig({ mode: "branch", baseBranch: "main" });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue({
        commitSha: "abc123",
        commands: ["git add . && git commit -m \"chore: Workflow 'Test Workflow' auto-commit\""],
      });
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
        { baseBranch: "main" },
        "Restored original branch"
      );
    });

    it("stays on feature branch when preserve: true", async () => {
      const config = createConfig({
        mode: "branch",
        baseBranch: "main",
        preserve: true,
      });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue({
        commitSha: "abc123",
        commands: ["git add . && git commit -m \"chore: Workflow 'Test Workflow' auto-commit\""],
      });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalled();
      expect(switchBranch).not.toHaveBeenCalled();
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        "Staying on feature branch for review"
      );
    });

    it("skips checkout when baseBranch not provided", async () => {
      const config = createConfig({ mode: "branch", baseBranch: null });

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
    it("commits and removes worktree by default (preserve: false), NEVER touches main project", async () => {
      const config = createConfig({
        mode: "worktree",
        baseBranch: "main",
        workingDir: "/test/project/.worktrees/run-123-feat",
        worktreePath: "/test/project/.worktrees/run-123-feat",
      });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue({
        commitSha: "abc123",
        commands: ["git add . && git commit -m \"chore: Workflow 'Test Workflow' auto-commit\""],
      });
      vi.mocked(removeWorktree).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalledWith({
        projectPath: "/test/project/.worktrees/run-123-feat",
        message: "chore: Workflow 'Workflow' auto-commit",
      });
      expect(removeWorktree).toHaveBeenCalledWith({
        projectPath: "/test/project",
        worktreePath: "/test/project/.worktrees/run-123-feat",
      });
      // IMPORTANT: Main project should NEVER be touched in worktree mode
      expect(switchBranch).not.toHaveBeenCalled();
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        { worktreePath: "/test/project/.worktrees/run-123-feat" },
        "Removed worktree"
      );
    });

    it("keeps worktree when preserve: true", async () => {
      const config = createConfig({
        mode: "worktree",
        baseBranch: "main",
        workingDir: "/test/project/.worktrees/run-123-feat",
        worktreePath: "/test/project/.worktrees/run-123-feat",
        preserve: true,
      });

      vi.mocked(getGitStatus).mockResolvedValue({
        files: [{ path: "file.ts", status: "modified" }],
      });
      vi.mocked(commitChanges).mockResolvedValue({
        commitSha: "abc123",
        commands: ["git add . && git commit -m \"chore: Workflow 'Test Workflow' auto-commit\""],
      });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(commitChanges).toHaveBeenCalled();
      expect(removeWorktree).not.toHaveBeenCalled();
      expect(switchBranch).not.toHaveBeenCalled();
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        { worktreePath: "/test/project/.worktrees/run-123-feat" },
        "Keeping worktree for review"
      );
    });

    it("never touches main project even without baseBranch", async () => {
      const config = createConfig({
        mode: "worktree",
        baseBranch: null,
        workingDir: "/test/project/.worktrees/run-123-feat",
        worktreePath: "/test/project/.worktrees/run-123-feat",
      });

      vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
      vi.mocked(removeWorktree).mockResolvedValue();

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(removeWorktree).toHaveBeenCalled();
      expect(switchBranch).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("propagates errors from getGitStatus", async () => {
      const config = createConfig({ mode: "stay" });

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
      const config = createConfig({ mode: "stay" });

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
      const config = createConfig({ mode: "branch", baseBranch: "main" });

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
      const config = createConfig({
        mode: "worktree",
        baseBranch: "main",
        workingDir: "/test/project/.worktrees/run-123-feat",
        worktreePath: "/test/project/.worktrees/run-123-feat",
      });

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

      const config = createConfig({ mode: "stay" });

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
  });

  describe("Skip conditions", () => {
    it("skips when workingDir is empty", async () => {
      const config = createConfig({ mode: "stay", workingDir: "" });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(getGitStatus).not.toHaveBeenCalled();
    });

    it("skips when mode is null", async () => {
      const config = createConfig({ mode: null });

      const finalizeWorkspace = createFinalizeWorkspaceStep(
        mockContext,
        mockInngestStep as never
      );
      await finalizeWorkspace("finalize-workspace", config);

      expect(getGitStatus).not.toHaveBeenCalled();
    });
  });
});
