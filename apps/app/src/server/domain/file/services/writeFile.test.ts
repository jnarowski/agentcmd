import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { writeFile } from "./writeFile";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestUser, createTestProject } from "@/server/test-utils/fixtures";
import fs from "fs/promises";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    writeFile: vi.fn(),
  },
}));

describe("writeFile", () => {
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

    // Default mock for successful write
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("writes file with relative path", async () => {
    await writeFile({
      projectId,
      filePath: "src/index.ts",
      content: "console.log('hello');",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      `${projectPath}/src/index.ts`,
      "console.log('hello');",
      "utf-8"
    );
  });

  it("writes file with absolute path within project", async () => {
    const absolutePath = `${projectPath}/src/main.ts`;

    await writeFile({
      projectId,
      filePath: absolutePath,
      content: "export default {};",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      absolutePath,
      "export default {};",
      "utf-8"
    );
  });

  it("prevents path traversal with ../", async () => {
    await expect(
      writeFile({
        projectId,
        filePath: "../../../etc/passwd",
        content: "malicious content",
      })
    ).rejects.toThrow("Access denied: File is outside project directory");

    // File should not be written
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it("prevents absolute path outside project", async () => {
    await expect(
      writeFile({
        projectId,
        filePath: "/etc/passwd",
        content: "malicious content",
      })
    ).rejects.toThrow("Access denied: File is outside project directory");

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it("throws error for non-existent project", async () => {
    await expect(
      writeFile({
        projectId: "non-existent-project",
        filePath: "file.txt",
        content: "content",
      })
    ).rejects.toThrow("Project not found");
  });

  it("throws error when write fails", async () => {
    vi.mocked(fs.writeFile).mockRejectedValue(new Error("Write error"));

    await expect(
      writeFile({
        projectId,
        filePath: "file.txt",
        content: "content",
      })
    ).rejects.toThrow("Failed to write file content");
  });

  it("overwrites existing files", async () => {
    await writeFile({
      projectId,
      filePath: "existing.txt",
      content: "new content",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      `${projectPath}/existing.txt`,
      "new content",
      "utf-8"
    );
  });

  it("writes empty content", async () => {
    await writeFile({
      projectId,
      filePath: "empty.txt",
      content: "",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      `${projectPath}/empty.txt`,
      "",
      "utf-8"
    );
  });

  it("writes large content", async () => {
    const largeContent = "x".repeat(1000000);

    await writeFile({
      projectId,
      filePath: "large.txt",
      content: largeContent,
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      `${projectPath}/large.txt`,
      largeContent,
      "utf-8"
    );
  });

  it("normalizes paths correctly", async () => {
    await writeFile({
      projectId,
      filePath: "src/./components/../index.ts",
      content: "content",
    });

    // Should resolve to src/index.ts
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("/src/index.ts"),
      "content",
      "utf-8"
    );
  });

  it("blocks path traversal with symbolic path tricks", async () => {
    await expect(
      writeFile({
        projectId,
        filePath: "src/../../etc/passwd",
        content: "malicious",
      })
    ).rejects.toThrow("Access denied: File is outside project directory");
  });

  it("allows writing files in subdirectories", async () => {
    await writeFile({
      projectId,
      filePath: "src/components/Button/index.tsx",
      content: "export const Button = () => {};",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      `${projectPath}/src/components/Button/index.tsx`,
      "export const Button = () => {};",
      "utf-8"
    );
  });

  it("handles Windows-style paths", async () => {
    await writeFile({
      projectId,
      filePath: "src\\components\\Button.tsx",
      content: "content",
    });

    // Path should be normalized
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("writes files with special characters in name", async () => {
    await writeFile({
      projectId,
      filePath: "file with spaces & special (chars).txt",
      content: "content",
    });

    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("writes files with newlines", async () => {
    const contentWithNewlines = "line1\nline2\nline3";

    await writeFile({
      projectId,
      filePath: "multiline.txt",
      content: contentWithNewlines,
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      `${projectPath}/multiline.txt`,
      contentWithNewlines,
      "utf-8"
    );
  });

  it("writes files with unicode content", async () => {
    const unicodeContent = "Hello 世界 🌍";

    await writeFile({
      projectId,
      filePath: "unicode.txt",
      content: unicodeContent,
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      `${projectPath}/unicode.txt`,
      unicodeContent,
      "utf-8"
    );
  });

  it("handles permission errors", async () => {
    vi.mocked(fs.writeFile).mockRejectedValue(new Error("EACCES"));

    await expect(
      writeFile({
        projectId,
        filePath: "protected.txt",
        content: "content",
      })
    ).rejects.toThrow("Failed to write file content");
  });

  it("handles disk full errors", async () => {
    vi.mocked(fs.writeFile).mockRejectedValue(new Error("ENOSPC"));

    await expect(
      writeFile({
        projectId,
        filePath: "file.txt",
        content: "content",
      })
    ).rejects.toThrow("Failed to write file content");
  });
});
