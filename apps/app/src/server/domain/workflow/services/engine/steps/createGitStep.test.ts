import { describe, it, expect, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createGitStep } from "./createGitStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import * as commitChangesModule from "@/server/domain/git/services/commitChanges";
import * as createAndSwitchBranchModule from "@/server/domain/git/services/createAndSwitchBranch";
import * as createPullRequestModule from "@/server/domain/git/services/createPullRequest";

vi.mock("@/server/domain/git/services/commitChanges");
vi.mock("@/server/domain/git/services/createAndSwitchBranch");
vi.mock("@/server/domain/git/services/createPullRequest");

describe("createGitStep", () => {
  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("executes commit operation with message", async () => {
    // Arrange
    const mockCommitChanges = vi.mocked(commitChangesModule.commitChanges);
    mockCommitChanges.mockResolvedValue("abc123");

    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password_hash: "hash",
      },
    });
    const project = await prisma.project.create({
      data: { name: "Test Project", path: "/tmp/test" },
    });
    const workflow = await prisma.workflowDefinition.create({
      data: { 
        project_id: project.id,
        name: "test-workflow", 
        identifier: "test-workflow", 
        type: "code", 
        path: "/tmp/test.ts", 
        phases: [] 
      },
    });
    const execution = await prisma.workflowRun.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        workflow_definition_id: workflow.id,
        name: "Test Execution",
        args: {},
        status: "running",
      },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "release",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const gitStepFn = createGitStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    const result = await gitStepFn("commit-changes", {
      operation: "commit",
      message: "feat: add new feature",
    });

    // Assert
    expect(result.operation).toBe("commit");
    expect(result.commitSha).toBe("abc123");
    expect(result.success).toBe(true);
    expect(mockCommitChanges).toHaveBeenCalledWith({
      projectPath: "/tmp/test",
      message: "feat: add new feature",
      files: ["."]
    });
  });

  it("executes branch operation with branch name", async () => {
    // Arrange
    const mockCreateAndSwitchBranch = vi.mocked(
      createAndSwitchBranchModule.createAndSwitchBranch
    );
    mockCreateAndSwitchBranch.mockResolvedValue(undefined);

    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password_hash: "hash",
      },
    });
    const project = await prisma.project.create({
      data: { name: "Test Project", path: "/tmp/test" },
    });
    const workflow = await prisma.workflowDefinition.create({
      data: { 
        project_id: project.id,
        name: "test-workflow", 
        identifier: "test-workflow", 
        type: "code", 
        path: "/tmp/test.ts", 
        phases: [] 
      },
    });
    const execution = await prisma.workflowRun.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        workflow_definition_id: workflow.id,
        name: "Test Execution",
        args: {},
        status: "running",
      },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "setup",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const gitStepFn = createGitStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    const result = await gitStepFn("create-branch", {
      operation: "branch",
      branch: "feature/new-feature",
    });

    // Assert
    expect(result.operation).toBe("branch");
    expect(result.branch).toBe("feature/new-feature");
    expect(result.success).toBe(true);
    expect(mockCreateAndSwitchBranch).toHaveBeenCalledWith({
      projectPath: "/tmp/test",
      branchName: "feature/new-feature",
      from: undefined
    });
  });

  it("executes pr operation with title and body", async () => {
    // Arrange
    const mockCreatePullRequest = vi.mocked(
      createPullRequestModule.createPullRequest,
    );
    mockCreatePullRequest.mockResolvedValue({
      success: true,
      prUrl: "https://github.com/org/repo/pull/123",
    });

    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password_hash: "hash",
      },
    });
    const project = await prisma.project.create({
      data: { name: "Test Project", path: "/tmp/test" },
    });
    const workflow = await prisma.workflowDefinition.create({
      data: {
        project_id: project.id,
        name: "test-workflow",
        identifier: "test-workflow",
        type: "code",
        path: "/tmp/test.ts",
        phases: [],
      },
    });
    const execution = await prisma.workflowRun.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        workflow_definition_id: workflow.id,
        name: "Test Execution",
        args: {},
        status: "running",
      },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-123",
      currentPhase: "release",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const gitStepFn = createGitStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"],
    );

    // Act
    const result = await gitStepFn("create-pr", {
      operation: "pr",
      title: "Add new feature",
      body: "This PR adds a new feature",
    });

    // Assert
    expect(result.operation).toBe("pr");
    expect(result.prUrl).toBe("https://github.com/org/repo/pull/123");
    expect(result.success).toBe(true);
    expect(mockCreatePullRequest).toHaveBeenCalledWith({
      projectPath: "/tmp/test",
      title: "Add new feature",
      description: "This PR adds a new feature",
      baseBranch: "main",
    });
  });

  it("accepts sentence case and converts to kebab-case ID", async () => {
    // Arrange
    const mockCommitChanges = vi.mocked(commitChangesModule.commitChanges);
    mockCommitChanges.mockResolvedValue("def456");

    const user = await prisma.user.create({
      data: {
        email: "test2@example.com",
        password_hash: "hash",
      },
    });
    const project = await prisma.project.create({
      data: { name: "Test Project 2", path: "/tmp/test2" },
    });
    const workflow = await prisma.workflowDefinition.create({
      data: {
        project_id: project.id,
        name: "test-workflow-2",
        identifier: "test-workflow-2",
        type: "code",
        path: "/tmp/test2.ts",
        phases: [],
      },
    });
    const execution = await prisma.workflowRun.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        workflow_definition_id: workflow.id,
        name: "Test Execution 2",
        args: {},
        status: "running",
      },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test2",
      userId: "user-123",
      currentPhase: "release",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const gitStepFn = createGitStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"],
    );

    // Act
    await gitStepFn("Commit Changes", {
      operation: "commit",
      message: "feat: new feature",
    });

    // Assert - Inngest step ID uses kebab-case conversion
    expect(mockInngestStep.run).toHaveBeenCalledWith(
      expect.stringContaining("commit-changes"),
      expect.any(Function),
    );
  });

  it("both formats produce same Inngest step ID", async () => {
    // Arrange
    const mockCommitChanges = vi.mocked(commitChangesModule.commitChanges);
    mockCommitChanges.mockResolvedValue("ghi789");

    const user = await prisma.user.create({
      data: {
        email: "test3@example.com",
        password_hash: "hash",
      },
    });
    const project = await prisma.project.create({
      data: { name: "Test Project 3", path: "/tmp/test3" },
    });
    const workflow = await prisma.workflowDefinition.create({
      data: {
        project_id: project.id,
        name: "test-workflow-3",
        identifier: "test-workflow-3",
        type: "code",
        path: "/tmp/test3.ts",
        phases: [],
      },
    });
    const execution = await prisma.workflowRun.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        workflow_definition_id: workflow.id,
        name: "Test Execution 3",
        args: {},
        status: "running",
      },
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test3",
      userId: "user-123",
      currentPhase: "release",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const gitStepFn = createGitStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"],
    );

    // Act - call with sentence case
    await gitStepFn("Push Code", {
      operation: "commit",
      message: "initial commit",
    });

    const firstCallId = mockInngestStep.run.mock.calls[0][0];

    // Act - call with kebab-case
    mockInngestStep.run.mockClear();
    await gitStepFn("push-code", {
      operation: "commit",
      message: "second commit",
    });

    const secondCallId = mockInngestStep.run.mock.calls[0][0];

    // Assert - both produce the same Inngest step ID
    expect(firstCallId).toBe(secondCallId);
    expect(firstCallId).toContain("push-code");
  });
});
