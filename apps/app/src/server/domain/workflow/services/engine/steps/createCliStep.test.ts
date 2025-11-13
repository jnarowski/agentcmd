import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import type { ChildProcess } from "node:child_process";
import { cleanTestDB } from "@/server/test-utils/db";
import { createCliStep } from "./createCliStep";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { exec } from "node:child_process";

vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

describe("createCliStep", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("executes command successfully and returns exit code 0", async () => {
    // Arrange
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation(
      (
        cmd,
        opts,
        callback: (
          error: Error | null,
          result: { stdout: string; stderr: string }
        ) => void
      ) => {
        callback(null, { stdout: "Hello World", stderr: "" });
        return {} as ChildProcess;
      }
    );

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
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(async <T>(id: string, fn: () => Promise<T>) => await fn()),
    };

    const cliStepFn = createCliStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    const result = await cliStepFn("echo-test", {
      command: "echo 'Hello World'",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.exitCode).toBe(0);
    expect(result.data.stdout).toBe("Hello World");
    expect(result.data.command).toBe("echo 'Hello World'");
  });

  it("accepts sentence case idOrName and converts to kebab-case", async () => {
    // Arrange
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation(
      (
        cmd,
        opts,
        callback: (
          error: Error | null,
          result: { stdout: string; stderr: string }
        ) => void
      ) => {
        callback(null, { stdout: "Success", stderr: "" });
        return {} as ChildProcess;
      }
    );

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
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(async <T>(id: string, fn: () => Promise<T>) => {
        // Verify kebab-case ID with phase prefix
        expect(id).toBe("build-run-tests");
        return await fn();
      }),
    };

    const cliStepFn = createCliStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act - Pass sentence case
    const result = await cliStepFn("Run Tests", {
      command: "npm test",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockInngestStep.run).toHaveBeenCalledWith("build-run-tests", expect.any(Function));
  });

  it("accepts kebab-case idOrName and uses as-is", async () => {
    // Arrange
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation(
      (
        cmd,
        opts,
        callback: (
          error: Error | null,
          result: { stdout: string; stderr: string }
        ) => void
      ) => {
        callback(null, { stdout: "Success", stderr: "" });
        return {} as ChildProcess;
      }
    );

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
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(async <T>(id: string, fn: () => Promise<T>) => {
        // Expect phase prefix since currentPhase is "build"
        expect(id).toBe("build-build-project");
        return await fn();
      }),
    };

    const cliStepFn = createCliStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act - Pass kebab-case
    const result = await cliStepFn("build-project", {
      command: "npm run build",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockInngestStep.run).toHaveBeenCalledWith("build-build-project", expect.any(Function));
  });

  it("handles command failure with non-zero exit code", async () => {
    // Arrange
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation(
      (
        cmd,
        opts,
        callback: (
          error: Error | null,
          result: { stdout: string; stderr: string }
        ) => void
      ) => {
        const error = Object.assign(new Error("Command failed"), {
          code: 1,
          stdout: "",
          stderr: "Command not found",
        });
        callback(error);
        return {} as ChildProcess;
      }
    );

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
      currentPhase: "build",
      logger: console as unknown as RuntimeContext["logger"],
    };

    const mockInngestStep = {
      run: vi.fn(async <T>(id: string, fn: () => Promise<T>) => await fn()),
    };

    const cliStepFn = createCliStep(
      context,
      mockInngestStep as RuntimeContext["inngestStep"]
    );

    // Act
    const result = await cliStepFn("failing-command", {
      command: "invalid-command",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.data.exitCode).toBe(1);
    expect(result.data.stderr).toBe("Command not found");
  });
});
