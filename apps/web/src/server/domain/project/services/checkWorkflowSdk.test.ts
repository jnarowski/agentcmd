import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkWorkflowSdk } from "./checkWorkflowSdk";
import * as fs from "node:fs/promises";

vi.mock("node:fs/promises");

describe("checkWorkflowSdk", () => {
  const mockProjectPath = "/fake/project";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects SDK in devDependencies", async () => {
    // Given: package.json with SDK in devDeps
    const packageJson = {
      name: "test-project",
      version: "1.0.0",
      devDependencies: {
        "@repo/workflow-sdk": "^1.2.3",
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(packageJson));

    // When: checkWorkflowSdk()
    const result = await checkWorkflowSdk({ projectPath: mockProjectPath });

    // Then: SDK is detected with correct version
    expect(result).toEqual({
      hasPackageJson: true,
      installed: true,
      version: "^1.2.3",
    });
  });

  it("returns not installed when SDK missing", async () => {
    // Given: package.json without SDK
    const packageJson = {
      name: "test-project",
      version: "1.0.0",
      dependencies: {
        react: "^18.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(packageJson));

    // When: checkWorkflowSdk()
    const result = await checkWorkflowSdk({ projectPath: mockProjectPath });

    // Then: SDK is not installed
    expect(result).toEqual({
      hasPackageJson: true,
      installed: false,
      version: undefined,
    });
  });

  it("returns no package.json when file missing", async () => {
    // Given: no package.json (readFile throws ENOENT)
    vi.mocked(fs.readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
      })
    );

    // When: checkWorkflowSdk()
    const result = await checkWorkflowSdk({ projectPath: mockProjectPath });

    // Then: package.json doesn't exist
    expect(result).toEqual({
      hasPackageJson: false,
      installed: false,
    });
  });
});
