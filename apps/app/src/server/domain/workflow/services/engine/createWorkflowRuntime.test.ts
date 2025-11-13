import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWorkflowRuntime } from "./createWorkflowRuntime";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import type { WorkflowConfig, WorkflowFunction } from "agentcmd-workflows";
import type { Inngest } from "inngest";

// Mock dependencies
vi.mock("@/server/domain/workflow/services/events/broadcastWorkflowEvent", () => ({
  broadcastWorkflowEvent: vi.fn(),
}));

vi.mock("@/server/domain/workflow/services/events/createWorkflowEvent", () => ({
  createWorkflowEvent: vi.fn(),
}));

vi.mock("@/server/domain/git/services/getCurrentBranch", () => ({
  getCurrentBranch: vi.fn(),
}));

vi.mock("@/server/domain/git/services/getGitStatus", () => ({
  getGitStatus: vi.fn(),
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

vi.mock("@/server/domain/git/services/removeWorktree", () => ({
  removeWorktree: vi.fn(),
}));

vi.mock("@/server/domain/git/services/switchBranch", () => ({
  switchBranch: vi.fn(),
}));

vi.mock("@/server/domain/workflow/services/resolveSpecFile", () => ({
  resolveSpecFile: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

// Import mocked functions
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { createAndSwitchBranch } from "@/server/domain/git/services/createAndSwitchBranch";
import { createWorktree } from "@/server/domain/git/services/createWorktree";
import { removeWorktree } from "@/server/domain/git/services/removeWorktree";
import { switchBranch } from "@/server/domain/git/services/switchBranch";
import { resolveSpecFile } from "@/server/domain/workflow/services/resolveSpecFile";
import { existsSync } from "fs";

describe("createWorkflowRuntime - Automatic Lifecycle", () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
  };

  let mockInngest: Inngest;
  let user: Awaited<ReturnType<typeof prisma.user.create>>;
  let project: Awaited<ReturnType<typeof prisma.project.create>>;
  let workflowDefinition: Awaited<ReturnType<typeof prisma.workflowDefinition.create>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up default git mock responses
    vi.mocked(getCurrentBranch).mockResolvedValue("main");
    vi.mocked(getGitStatus).mockResolvedValue({ files: [] });
    vi.mocked(commitChanges).mockResolvedValue({
      commitSha: "abc123",
      commands: ["git add .", "git commit -m \"Auto-commit\""],
    });
    vi.mocked(createAndSwitchBranch).mockResolvedValue({
      branch: { name: "feat-test", current: true },
      commands: ["git checkout -b feat-test"],
    });
    vi.mocked(createWorktree).mockResolvedValue("/tmp/test-project/.worktrees/feat-test");
    vi.mocked(removeWorktree).mockResolvedValue();
    vi.mocked(switchBranch).mockResolvedValue();
    vi.mocked(resolveSpecFile).mockResolvedValue(".agent/specs/todo/251024120101-test-feature/spec.md");
    vi.mocked(existsSync).mockReturnValue(true);

    // Create test data
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password_hash: "hash",
      },
    });

    project = await prisma.project.create({
      data: {
        name: "Test Project",
        path: "/tmp/test-project",
      },
    });

    workflowDefinition = await prisma.workflowDefinition.create({
      data: {
        project_id: project.id,
        name: "Test Workflow",
        identifier: "test-workflow",
        type: "code",
        path: "/tmp/test-workflow.ts",
        phases: [{ id: "implement", label: "Implement" }],
      },
    });

    // Create a simplified mock Inngest client
    mockInngest = {
      createFunction: vi.fn((config, trigger, fn) => {
        return { config, trigger, fn } as never;
      }),
    } as unknown as Inngest;
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  describe("Lifecycle with workspace mode", () => {
    it("creates _system_setup phase before workflow", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const workflowFn: WorkflowFunction = async ({ event }) => {
        expect(event.data.workingDir).toBeDefined();
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      // Execute the function
      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify _system_setup phase was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "_system_setup" }),
        "Phase started"
      );

      // Verify workspace setup completed
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "branch" }),
        "Workspace setup completed"
      );

      // Verify run was updated to running status
      const updatedRun = await prisma.workflowRun.findUnique({
        where: { id: run.id },
      });
      expect(updatedRun?.status).toBe("completed");
    });

    it("creates _system_finalize phase after workflow", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "worktree",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const phasesSeen: string[] = [];
      const workflowFn: WorkflowFunction = async ({ step }) => {
        const originalPhase = step.phase;
        step.phase = async (name: string, fn: () => Promise<unknown>) => {
          phasesSeen.push(name);
          return await originalPhase(name, fn);
        };
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify _system_finalize was called
      expect(phasesSeen).toContain("_system_finalize");
      expect(phasesSeen[phasesSeen.length - 1]).toBe("_system_finalize"); // Should be last
    });

    it("finalize runs even when workflow fails", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const phasesSeen: string[] = [];
      const workflowFn: WorkflowFunction = async ({ step }) => {
        const originalPhase = step.phase;
        step.phase = async (name: string, fn: () => Promise<unknown>) => {
          phasesSeen.push(name);
          return await originalPhase(name, fn);
        };
        throw new Error("Workflow execution failed");
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      // Workflow should fail, but finalize should still run
      await expect(
        inngestFn.fn({
          event: {
            name: "project.test-workflow",
            data: {
              runId: run.id,
              projectId: project.id,
              userId: user.id,
              projectPath: project.path,
            },
          },
          step: {
            run: vi.fn(async (_id, callback) => await callback()),
          } as never,
          runId: "inngest-run-123",
        } as never)
      ).rejects.toThrow("Workflow execution failed");

      // Verify _system_finalize was still called despite error
      expect(phasesSeen).toContain("_system_finalize");

      // Verify run status is failed
      const updatedRun = await prisma.workflowRun.findUnique({
        where: { id: run.id },
      });
      expect(updatedRun?.status).toBe("failed");
      expect(updatedRun?.error_message).toBe("Workflow execution failed");
    });

    it("provides workspace when automatic setup enabled with non-null workspace mode", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      let capturedWorkingDir: string | undefined = undefined;
      const workflowFn: WorkflowFunction = async ({ event }) => {
        capturedWorkingDir = event.data.workingDir;
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify workingDir was added to event.data
      expect(capturedWorkingDir).toBeDefined();
    });
  });

  describe("Lifecycle without workspace mode", () => {
    it("skips setup/finalize when mode is null", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: null, // No workspace mode
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const phasesSeen: string[] = [];
      const workflowFn: WorkflowFunction = async ({ step, event }) => {
        const originalPhase = step.phase;
        step.phase = async (name: string, fn: () => Promise<unknown>) => {
          phasesSeen.push(name);
          return await originalPhase(name, fn);
        };

        // workingDir should still be set in event.data
        expect(event.data.workingDir).toBeDefined();

        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify _system_* phases were not created
      expect(phasesSeen).not.toContain("_system_setup");
      expect(phasesSeen).not.toContain("_system_finalize");

      // Verify "No workspace mode specified" was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ runId: run.id }),
        "No workspace mode specified, using stay mode"
      );
    });

    it("provides default stay mode workspace when mode is null", async () => {
      const getCurrentBranch = await import("@/server/domain/git/services/getCurrentBranch");
      vi.mocked(getCurrentBranch.getCurrentBranch).mockResolvedValue("develop");

      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: null,
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      let capturedWorkingDir: string | undefined = undefined;
      const workflowFn: WorkflowFunction = async ({ event }) => {
        capturedWorkingDir = event.data.workingDir;
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      expect(capturedWorkingDir).toBe(project.path);
    });
  });

  describe("Finalize error handling", () => {
    it("logs finalize errors as non-fatal", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "worktree",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      let finalizeCallCount = 0;
      const workflowFn: WorkflowFunction = async ({ step }) => {
        // Override phase to make finalize throw
        const originalPhase = step.phase;
        step.phase = async (name: string, fn: () => Promise<unknown>) => {
          if (name === "_system_finalize") {
            finalizeCallCount++;
            throw new Error("Finalize failed: worktree locked");
          }
          return await originalPhase(name, fn);
        };
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      // Workflow should succeed despite finalize error
      await expect(
        inngestFn.fn({
          event: {
            name: "project.test-workflow",
            data: {
              runId: run.id,
              projectId: project.id,
              userId: user.id,
              projectPath: project.path,
            },
          },
          step: {
            run: vi.fn(async (_id, callback) => await callback()),
          } as never,
          runId: "inngest-run-123",
        } as never)
      ).resolves.toEqual({ success: true });

      // Verify finalize was attempted
      expect(finalizeCallCount).toBe(1);

      // Verify error was logged as non-fatal
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Finalize failed: worktree locked",
        }),
        "Failed to finalize workspace (non-fatal)"
      );

      // Verify workflow still completed successfully
      const updatedRun = await prisma.workflowRun.findUnique({
        where: { id: run.id },
      });
      expect(updatedRun?.status).toBe("completed");
    });
  });

  describe("Workspace configuration from DB", () => {
    it("uses mode, branch_name, base_branch from workflow run", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "worktree",
          branch_name: "feat/custom-branch",
          base_branch: "develop",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      let capturedWorkingDir: string | undefined = undefined;
      const workflowFn: WorkflowFunction = async ({ event }) => {
        capturedWorkingDir = event.data.workingDir;
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify workspace was configured and workingDir was set
      expect(capturedWorkingDir).toBeDefined();
    });

    it("auto-generates worktree name from runId and branchName", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "worktree",
          branch_name: "feat/auto-generated",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const workflowFn: WorkflowFunction = async () => {
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify worktree was set up in worktree mode
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "worktree",
          workingDir: expect.any(String),
        }),
        "Workspace setup completed"
      );

      // Verify createWorktree was called (worktree name is auto-generated internally)
      expect(createWorktree).toHaveBeenCalledWith({
        projectPath: project.path,
        branch: "feat/auto-generated",
      });
    });
  });

  describe("Spec generation in _system_setup", () => {
    it("generates spec file automatically when spec_type provided", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      let capturedSpecFile: string | undefined = undefined;
      const workflowFn: WorkflowFunction = async ({ event }) => {
        capturedSpecFile = event.data.specFile;
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
            specType: "feature",
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify specFile was populated
      expect(capturedSpecFile).toBeDefined();
      expect(capturedSpecFile).toContain(".agent/specs/todo/");
      expect(capturedSpecFile).toContain("spec.md");

      // Verify resolveSpecFile was called
      expect(resolveSpecFile).toHaveBeenCalled();

      // Verify spec generation was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ specType: "feature" }),
        "Generating spec file"
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          specFile: expect.stringContaining(".agent/specs/todo/")
        }),
        "Spec file generated"
      );
    });

    it("defaults to feature spec type when not specified", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const workflowFn: WorkflowFunction = async () => {
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
            // No specType provided - should default to "feature"
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify default "feature" spec type was used
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ specType: "feature" }),
        "Generating spec file"
      );
    });

    it("verifies existing spec file if provided", async () => {
      const existingSpecPath = "/tmp/test-project/.agent/specs/todo/existing-spec/spec.md";
      vi.mocked(existsSync).mockReturnValue(true);

      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      let capturedSpecFile: string | undefined = undefined;
      const workflowFn: WorkflowFunction = async ({ event }) => {
        capturedSpecFile = event.data.specFile;
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
            specFile: existingSpecPath,
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify specFile was kept as-is
      expect(capturedSpecFile).toBe(existingSpecPath);

      // Verify resolveSpecFile was NOT called
      expect(resolveSpecFile).not.toHaveBeenCalled();

      // Verify file existence was checked
      expect(existsSync).toHaveBeenCalledWith(existingSpecPath);

      // Verify log message
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ specFile: existingSpecPath }),
        "Using provided spec file"
      );
    });

    it("throws error when provided spec file doesn't exist", async () => {
      const nonExistentSpecPath = "/tmp/test-project/.agent/specs/todo/missing-spec/spec.md";
      vi.mocked(existsSync).mockReturnValue(false);

      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const workflowFn: WorkflowFunction = async () => {
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await expect(
        inngestFn.fn({
          event: {
            name: "project.test-workflow",
            data: {
              runId: run.id,
              projectId: project.id,
              userId: user.id,
              projectPath: project.path,
              specFile: nonExistentSpecPath,
            },
          },
          step: {
            run: vi.fn(async (_id, callback) => await callback()),
          } as never,
          runId: "inngest-run-123",
        } as never)
      ).rejects.toThrow(`Spec file not found: ${nonExistentSpecPath}`);

      // Verify workflow was marked as failed
      const updatedRun = await prisma.workflowRun.findUnique({
        where: { id: run.id },
      });
      expect(updatedRun?.status).toBe("failed");
    });

    it("throws error when spec type slash command doesn't exist", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        // Mock that the slash command file doesn't exist
        if (typeof path === "string" && path.includes("generate-invalid-spec")) {
          return false;
        }
        return true;
      });

      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const workflowFn: WorkflowFunction = async () => {
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await expect(
        inngestFn.fn({
          event: {
            name: "project.test-workflow",
            data: {
              runId: run.id,
              projectId: project.id,
              userId: user.id,
              projectPath: project.path,
              specType: "invalid",
            },
          },
          step: {
            run: vi.fn(async (_id, callback) => await callback()),
          } as never,
          runId: "inngest-run-123",
        } as never)
      ).rejects.toThrow("Spec command not found: /cmd:generate-invalid-spec");

      // Verify error message includes helpful context
      await expect(
        inngestFn.fn({
          event: {
            name: "project.test-workflow",
            data: {
              runId: run.id,
              projectId: project.id,
              userId: user.id,
              projectPath: project.path,
              specType: "invalid",
            },
          },
          step: {
            run: vi.fn(async (_id, callback) => await callback()),
          } as never,
          runId: "inngest-run-123",
        } as never)
      ).rejects.toThrow("Available spec types can be found in .claude/commands/cmd/");

      // Verify workflow was marked as failed
      const updatedRun = await prisma.workflowRun.findUnique({
        where: { id: run.id },
      });
      expect(updatedRun?.status).toBe("failed");
    });

    it("runs spec generation in same _system_setup phase as workspace", async () => {
      const run = await prisma.workflowRun.create({
        data: {
          project_id: project.id,
          user_id: user.id,
          workflow_definition_id: workflowDefinition.id,
          name: "Test Run",
          args: {},
          mode: "branch",
          branch_name: "feat/test",
          base_branch: "main",
          status: "pending",
        },
        include: {
          project: true,
        },
      });

      const runtime = createWorkflowRuntime(mockInngest, project.id, mockLogger as never);

      const workflowConfig: WorkflowConfig = {
        id: "test-workflow",
        name: "Test Workflow",
        phases: [{ id: "implement", label: "Implement" }],
      };

      const workflowFn: WorkflowFunction = async () => {
        return { success: true };
      };

      const inngestFn = runtime.createInngestFunction(workflowConfig, workflowFn);

      await inngestFn.fn({
        event: {
          name: "project.test-workflow",
          data: {
            runId: run.id,
            projectId: project.id,
            userId: user.id,
            projectPath: project.path,
            specType: "feature",
          },
        },
        step: {
          run: vi.fn(async (_id, callback) => await callback()),
        } as never,
        runId: "inngest-run-123",
      } as never);

      // Verify both workspace setup and spec generation were logged
      // (both happen in _system_setup phase)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "_system_setup" }),
        "Phase started"
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "branch" }),
        "Workspace setup completed"
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ specType: "feature" }),
        "Generating spec file"
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          specFile: expect.stringContaining(".agent/specs/todo/")
        }),
        "Spec file generated"
      );
    });
  });
});
