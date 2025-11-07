import { describe, it, expect, vi, beforeEach } from "vitest";
import { installWorkflowSdk } from "./installWorkflowSdk";
import * as fs from "node:fs/promises";
import * as child_process from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

vi.mock("node:fs/promises");
vi.mock("node:child_process");

describe("installWorkflowSdk", () => {
  const mockProjectPath = "/fake/project";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockProcess(
    exitCode: number,
    stdout = "",
    stderr = ""
  ): ChildProcess {
    const mockProcess = new EventEmitter() as ChildProcess;
    mockProcess.stdout = new EventEmitter() as unknown as ChildProcess["stdout"];
    mockProcess.stderr = new EventEmitter() as unknown as ChildProcess["stderr"];

    // Emit data and close events asynchronously
    setImmediate(() => {
      if (stdout) mockProcess.stdout!.emit("data", Buffer.from(stdout));
      if (stderr) mockProcess.stderr!.emit("data", Buffer.from(stderr));
      mockProcess.emit("close", exitCode);
    });

    return mockProcess;
  }

  it("installs SDK successfully and runs init", async () => {
    // Given: project with pnpm-lock.yaml, no package.json
    vi.mocked(fs.access)
      .mockRejectedValueOnce(new Error("package.json not found")) // package.json doesn't exist
      .mockResolvedValueOnce(undefined) // pnpm-lock.yaml exists
      .mockResolvedValueOnce(undefined); // package.json exists after creation

    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    // Mock successful install command
    const installProcess = createMockProcess(
      0,
      "Installing @repo/workflow-sdk...\nSuccess!"
    );
    // Mock successful init command
    const initProcess = createMockProcess(
      0,
      "Initializing workflow-sdk...\nCreated .agent/workflows/"
    );

    vi.mocked(child_process.spawn)
      .mockReturnValueOnce(installProcess) // pnpm add -D @repo/workflow-sdk
      .mockReturnValueOnce(initProcess); // pnpm workflow-sdk init --yes

    // When: installWorkflowSdk()
    const result = await installWorkflowSdk({ projectPath: mockProjectPath });

    // Then: Creates package.json, installs SDK, runs init
    expect(fs.writeFile).toHaveBeenCalledWith(
      `${mockProjectPath}/package.json`,
      expect.stringContaining('"type": "module"'),
      "utf-8"
    );

    expect(child_process.spawn).toHaveBeenCalledWith(
      "pnpm",
      ["add", "-D", "@repo/workflow-sdk"],
      expect.objectContaining({ cwd: mockProjectPath })
    );

    expect(child_process.spawn).toHaveBeenCalledWith(
      "pnpm",
      ["workflow-sdk", "init", "--yes"],
      expect.objectContaining({ cwd: mockProjectPath })
    );

    expect(result).toEqual({
      success: true,
      message: "Workflow SDK installed and initialized successfully",
      output: expect.stringContaining("Installing @repo/workflow-sdk"),
    });
  });

  it("continues when init fails but install succeeds", async () => {
    // Given: install succeeds, init fails
    vi.mocked(fs.access).mockResolvedValue(undefined); // package.json exists
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined) // package.json exists
      .mockResolvedValueOnce(undefined); // pnpm-lock.yaml exists

    // Mock successful install
    const installProcess = createMockProcess(0, "Install success");
    // Mock failed init
    const initProcess = createMockProcess(
      1,
      "",
      "Error: workflow-sdk command not found"
    );

    vi.mocked(child_process.spawn)
      .mockReturnValueOnce(installProcess)
      .mockReturnValueOnce(initProcess);

    // When: installWorkflowSdk()
    const result = await installWorkflowSdk({ projectPath: mockProjectPath });

    // Then: Returns success=true with warning message
    expect(result.success).toBe(true);
    expect(result.message).toContain("initialization failed");
    expect(result.message).toContain("manually");
  });

  it("returns error when install fails", async () => {
    // Given: install command fails
    vi.mocked(fs.access).mockResolvedValue(undefined); // package.json exists
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined) // package.json exists
      .mockResolvedValueOnce(undefined); // pnpm-lock.yaml exists

    // Mock failed install
    const installProcess = createMockProcess(
      1,
      "",
      "Error: Failed to install package"
    );

    vi.mocked(child_process.spawn).mockReturnValueOnce(installProcess);

    // When: installWorkflowSdk()
    const result = await installWorkflowSdk({ projectPath: mockProjectPath });

    // Then: Returns success=false with error message
    expect(result.success).toBe(false);
    expect(result.message).toContain("Command failed with code 1");
    expect(result.output).toBeDefined();
  });
});
