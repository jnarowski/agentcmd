import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { readFile } from "./readFile";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestUser, createTestProject } from "@/server/test-utils/fixtures";
import fs from "fs/promises";

// Mock fs/promises
vi.mock("fs/promises");

describe("readFile", () => {
  let userId: string;
  let projectId: string;
  let projectPath: string;

  beforeEach(async () => {
    const user = await createTestUser(prisma);
    userId = user.id;

    const project = await createTestProject(prisma, {
      userId,
      name: "Test Project",
      path: "/test/project",
    });
    projectId = project.id;
    projectPath = project.path;
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("reads file with relative path", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("file content");

    const content = await readFile({
      projectId,
      filePath: "src/index.ts",
    });

    expect(content).toBe("file content");
    expect(fs.access).toHaveBeenCalledWith(
      `${projectPath}/src/index.ts`,
      expect.any(Number)
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      `${projectPath}/src/index.ts`,
      "utf-8"
    );
  });

  it("reads file with absolute path within project", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("file content");

    const absolutePath = `${projectPath}/src/main.ts`;

    const content = await readFile({
      projectId,
      filePath: absolutePath,
    });

    expect(content).toBe("file content");
    expect(fs.readFile).toHaveBeenCalledWith(absolutePath, "utf-8");
  });

  it("prevents path traversal with ../", async () => {
    await expect(
      readFile({
        projectId,
        filePath: "../../../etc/passwd",
      })
    ).rejects.toThrow("Access denied: File is outside project directory");
  });

  it("prevents absolute path outside project", async () => {
    await expect(
      readFile({
        projectId,
        filePath: "/etc/passwd",
      })
    ).rejects.toThrow("Access denied: File is outside project directory");
  });

  it("throws error for non-existent project", async () => {
    await expect(
      readFile({
        projectId: "non-existent-project",
        filePath: "file.txt",
      })
    ).rejects.toThrow("Project not found");
  });

  it("throws error for non-existent file", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

    await expect(
      readFile({
        projectId,
        filePath: "non-existent.txt",
      })
    ).rejects.toThrow("File not found or not accessible");
  });

  it("throws error for inaccessible file", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("EACCES"));

    await expect(
      readFile({
        projectId,
        filePath: "protected.txt",
      })
    ).rejects.toThrow("File not found or not accessible");
  });

  it("throws error when read fails", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValue(new Error("Read error"));

    await expect(
      readFile({
        projectId,
        filePath: "file.txt",
      })
    ).rejects.toThrow("Failed to read file content");
  });

  it("normalizes paths correctly", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("file content");

    // Path with . and ..
    await readFile({
      projectId,
      filePath: "src/./components/../index.ts",
    });

    // Should resolve to src/index.ts
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining("/src/index.ts"),
      "utf-8"
    );
  });

  it("blocks path traversal with symbolic path tricks", async () => {
    await expect(
      readFile({
        projectId,
        filePath: "src/../../etc/passwd",
      })
    ).rejects.toThrow("Access denied: File is outside project directory");
  });

  it("allows reading files in subdirectories", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("file content");

    const content = await readFile({
      projectId,
      filePath: "src/components/Button/index.tsx",
    });

    expect(content).toBe("file content");
    expect(fs.readFile).toHaveBeenCalledWith(
      `${projectPath}/src/components/Button/index.tsx`,
      "utf-8"
    );
  });

  it("handles Windows-style paths", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("file content");

    const content = await readFile({
      projectId,
      filePath: "src\\components\\Button.tsx",
    });

    expect(content).toBe("file content");
    // Path should be normalized
    expect(fs.readFile).toHaveBeenCalled();
  });

  it("reads empty files", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("");

    const content = await readFile({
      projectId,
      filePath: "empty.txt",
    });

    expect(content).toBe("");
  });

  it("reads large files", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const largeContent = "x".repeat(1000000);
    vi.mocked(fs.readFile).mockResolvedValue(largeContent);

    const content = await readFile({
      projectId,
      filePath: "large.txt",
    });

    expect(content).toBe(largeContent);
  });

  it("reads files with special characters in name", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("file content");

    const content = await readFile({
      projectId,
      filePath: "file with spaces & special (chars).txt",
    });

    expect(content).toBe("file content");
  });
});
