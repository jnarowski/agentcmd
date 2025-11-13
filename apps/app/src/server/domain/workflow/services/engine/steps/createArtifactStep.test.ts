import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import type { Stats } from "node:fs";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestWorkflowContext } from "@/server/test-utils/fixtures";
import { createArtifactStep } from "./createArtifactStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import * as fs from "node:fs/promises";

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  copyFile: vi.fn(),
}));

vi.mock("./utils/emitArtifactCreatedEvent", () => ({
  emitArtifactCreatedEvent: vi.fn(),
}));

describe("createArtifactStep", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("creates text artifact and stores in database", async () => {
    // Arrange
    const mockMkdir = vi.mocked(fs.mkdir);
    const mockWriteFile = vi.mocked(fs.writeFile);

    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-456",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const artifactStepFn = createArtifactStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    const result = await artifactStepFn("output-log", {
      type: "text",
      name: "build.log",
      content: "Build completed successfully",
    });

    // Assert
    expect(result.data.count).toBe(1);
    expect(result.data.totalSize).toBeGreaterThan(0);
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();

    const artifact = await prisma.workflowArtifact.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "build.log",
      },
    });
    expect(artifact).toBeDefined();
    expect(artifact?.file_type).toBe("text");
    expect(artifact?.phase).toBe("build");
  });

  it("creates file artifact and stores in database", async () => {
    // Arrange
    const mockMkdir = vi.mocked(fs.mkdir);
    const mockCopyFile = vi.mocked(fs.copyFile);
    const mockStat = vi.mocked(fs.stat);

    mockStat.mockResolvedValue({ size: 1024 } as Stats);

    const { run: execution } = await createTestWorkflowContext(prisma, {
      run: { name: "Test Execution", status: "running", args: {} }
    });

    const context: RuntimeContext = {
      runId: execution.id,
      projectId: "project-123",
      projectPath: "/tmp/test",
      userId: "user-456",
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const artifactStepFn = createArtifactStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    const result = await artifactStepFn("bundle", {
      type: "file",
      name: "app.bundle.js",
      file: "/tmp/source/dist/app.bundle.js",
    });

    // Assert
    expect(result.data.count).toBe(1);
    expect(result.data.totalSize).toBe(1024);
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockCopyFile).toHaveBeenCalled();

    const artifact = await prisma.workflowArtifact.findFirst({
      where: {
        workflow_run_id: execution.id,
        name: "app.bundle.js",
      },
    });
    expect(artifact).toBeDefined();
    expect(artifact?.file_type).toBe("file");
    expect(artifact?.size_bytes).toBe(1024);
  });

  it("accepts sentence case and converts to kebab-case ID", async () => {
    // Arrange
    vi.mocked(fs.mkdir);
    vi.mocked(fs.writeFile);

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
      userId: "user-456",
      currentPhase: "deploy",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const artifactStepFn = createArtifactStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"],
    );

    // Act
    await artifactStepFn("Output Log", {
      type: "text",
      name: "output.log",
      content: "Deploy complete",
    });

    // Assert - Inngest step ID uses kebab-case conversion
    expect(mockInngestStep.run).toHaveBeenCalledWith(
      expect.stringContaining("output-log"),
      expect.any(Function),
    );
  });

  it("both formats produce same Inngest step ID", async () => {
    // Arrange
    vi.mocked(fs.mkdir);
    vi.mocked(fs.writeFile);

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
      userId: "user-456",
      currentPhase: "test",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(<T>(id: string, fn: () => T) => fn()),
    };

    const artifactStepFn = createArtifactStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"],
    );

    // Act - call with sentence case
    await artifactStepFn("Test Results", {
      type: "text",
      name: "results.txt",
      content: "All tests passed",
    });

    const firstCallId = mockInngestStep.run.mock.calls[0][0];

    // Act - call with kebab-case
    mockInngestStep.run.mockClear();
    await artifactStepFn("test-results", {
      type: "text",
      name: "results2.txt",
      content: "Tests complete",
    });

    const secondCallId = mockInngestStep.run.mock.calls[0][0];

    // Assert - both produce the same Inngest step ID
    expect(firstCallId).toBe(secondCallId);
    expect(firstCallId).toContain("test-results");
  });
});
