import { describe, it, expect, vi, beforeEach } from "vitest";
import { installWorkflowPackage } from "./installWorkflowPackage";
import * as fs from "node:fs/promises";
import * as child_process from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

vi.mock("node:fs/promises");
vi.mock("node:child_process");

describe("installWorkflowPackage", () => {
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
      "Installing agentcmd-workflows...\nSuccess!"
    );
    // Mock successful init command
    const initProcess = createMockProcess(
      0,
      "Initializing agentcmd-workflows...\nCreated .agent/workflows/"
    );

    vi.mocked(child_process.spawn)
      .mockReturnValueOnce(installProcess) // pnpm add -D agentcmd-workflows
      .mockReturnValueOnce(initProcess); // pnpm agentcmd-workflows init --yes

    // When: installWorkflowPackage()
    const result = await installWorkflowPackage({ projectPath: mockProjectPath });

    // Then: Creates package.json, installs SDK, runs init
    expect(fs.writeFile).toHaveBeenCalledWith(
      `${mockProjectPath}/package.json`,
      expect.stringContaining('"type": "module"'),
      "utf-8"
    );

    expect(child_process.spawn).toHaveBeenCalledWith(
      "pnpm",
      ["add", "-D", "agentcmd-workflows"],
      expect.objectContaining({ cwd: mockProjectPath })
    );

    expect(child_process.spawn).toHaveBeenCalledWith(
      "pnpm",
      ["agentcmd-workflows", "init", "--yes"],
      expect.objectContaining({ cwd: mockProjectPath })
    );

    expect(result).toEqual({
      success: true,
      message: "Workflow package installed and initialized successfully",
      output: expect.stringContaining("Installing agentcmd-workflows"),
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
      "Error: agentcmd-workflows command not found"
    );

    vi.mocked(child_process.spawn)
      .mockReturnValueOnce(installProcess)
      .mockReturnValueOnce(initProcess);

    // When: installWorkflowPackage()
    const result = await installWorkflowPackage({ projectPath: mockProjectPath });

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

    // When: installWorkflowPackage()
    const result = await installWorkflowPackage({ projectPath: mockProjectPath });

    // Then: Returns success=false with error message
    expect(result.success).toBe(false);
    expect(result.message).toContain("Command failed with code 1");
    expect(result.output).toBeDefined();
  });
});
