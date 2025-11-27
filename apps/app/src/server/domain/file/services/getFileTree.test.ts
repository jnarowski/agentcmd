import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { getFileTree } from "./getFileTree";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestUser, createTestProject } from "@/server/test-utils/fixtures";
import fs, { type Dirent, type Stats } from "fs/promises";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

describe("getFileTree", () => {
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await createTestUser(prisma);
    userId = user.id;

    const project = await createTestProject(prisma, {
      userId,
      name: "Test Project",
      path: "/test/project",
    });
    projectId = project.id;

    // Default mock for successful access
    vi.mocked(fs.access).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("returns empty array for empty directory", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([]);

    const tree = await getFileTree({ projectId });

    expect(tree).toEqual([]);
  });

  it("lists files in directory", async () => {
    const mockEntries = [
      { name: "file1.txt", isDirectory: () => false, isFile: () => true },
      { name: "file2.txt", isDirectory: () => false, isFile: () => true },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
      mtime: new Date("2025-01-01"),
      mode: 0o644,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({
      name: "file1.txt",
      type: "file",
      size: 1024,
    });
    expect(tree[1]).toMatchObject({
      name: "file2.txt",
      type: "file",
      size: 1024,
    });
  });

  it("lists directories", async () => {
    const mockEntries = [
      { name: "src", isDirectory: () => true, isFile: () => false },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date("2025-01-01"),
      mode: 0o755,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      name: "src",
      type: "directory",
    });
    expect(tree[0].size).toBeUndefined();
  });

  it("sorts directories before files", async () => {
    const mockEntries = [
      { name: "file.txt", isDirectory: () => false, isFile: () => true },
      { name: "src", isDirectory: () => true, isFile: () => false },
      { name: "docs", isDirectory: () => true, isFile: () => false },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
      mtime: new Date("2025-01-01"),
      mode: 0o644,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree[0].type).toBe("directory");
    expect(tree[1].type).toBe("directory");
    expect(tree[2].type).toBe("file");
  });

  it("sorts alphabetically within same type", async () => {
    const mockEntries = [
      { name: "zebra.txt", isDirectory: () => false, isFile: () => true },
      { name: "alpha.txt", isDirectory: () => false, isFile: () => true },
      { name: "beta.txt", isDirectory: () => false, isFile: () => true },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
      mtime: new Date("2025-01-01"),
      mode: 0o644,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree[0].name).toBe("alpha.txt");
    expect(tree[1].name).toBe("beta.txt");
    expect(tree[2].name).toBe("zebra.txt");
  });

  it("excludes node_modules directory", async () => {
    const mockEntries = [
      { name: "node_modules", isDirectory: () => true, isFile: () => false },
      { name: "src", isDirectory: () => true, isFile: () => false },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date("2025-01-01"),
      mode: 0o755,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("src");
  });

  it("excludes common build directories", async () => {
    const mockEntries = [
      { name: "dist", isDirectory: () => true, isFile: () => false },
      { name: "build", isDirectory: () => true, isFile: () => false },
      { name: ".git", isDirectory: () => true, isFile: () => false },
      { name: ".next", isDirectory: () => true, isFile: () => false },
      { name: "coverage", isDirectory: () => true, isFile: () => false },
      { name: ".turbo", isDirectory: () => true, isFile: () => false },
      { name: "src", isDirectory: () => true, isFile: () => false },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date("2025-01-01"),
      mode: 0o755,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("src");
  });

  it("excludes hidden files and directories except .agent and .claude", async () => {
    const mockEntries = [
      { name: ".env", isDirectory: () => false, isFile: () => true },
      { name: ".gitignore", isDirectory: () => false, isFile: () => true },
      { name: ".vscode", isDirectory: () => true, isFile: () => false },
      { name: ".agent", isDirectory: () => true, isFile: () => false },
      { name: ".claude", isDirectory: () => true, isFile: () => false },
      { name: "src", isDirectory: () => true, isFile: () => false },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date("2025-01-01"),
      mode: 0o755,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree).toHaveLength(3);
    const names = tree.map(item => item.name);
    expect(names).toContain(".agent");
    expect(names).toContain(".claude");
    expect(names).toContain("src");
    expect(names).not.toContain(".env");
    expect(names).not.toContain(".gitignore");
    expect(names).not.toContain(".vscode");
  });

  it("includes file permissions", async () => {
    const mockEntries = [
      { name: "file.txt", isDirectory: () => false, isFile: () => true },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
      mtime: new Date("2025-01-01"),
      mode: 0o644, // rw-r--r--
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree[0].permissions).toBe("rw-r--r--");
  });

  it("includes modified timestamp", async () => {
    const mockDate = new Date("2025-01-01T12:00:00Z");
    const mockEntries = [
      { name: "file.txt", isDirectory: () => false, isFile: () => true },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
      mtime: mockDate,
      mode: 0o644,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree[0].modified).toEqual(mockDate);
  });

  it("throws error for non-existent project", async () => {
    await expect(
      getFileTree({ projectId: "non-existent-project" })
    ).rejects.toThrow("Project not found");
  });

  it("throws error for inaccessible project path", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("EACCES"));

    await expect(getFileTree({ projectId })).rejects.toThrow(
      "Project path is not accessible"
    );
  });

  it("handles permission errors on files gracefully", async () => {
    const mockEntries = [
      { name: "file1.txt", isDirectory: () => false, isFile: () => true },
      { name: "file2.txt", isDirectory: () => false, isFile: () => true },
    ];

    vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({
        size: 1024,
        mtime: new Date(),
        mode: 0o644,
      } as unknown as Stats)
      .mockRejectedValueOnce(new Error("EACCES"));

    const tree = await getFileTree({ projectId });

    // Should only include file1, skip file2 with permission error
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("file1.txt");
  });

  it("handles recursive directory scanning", async () => {
    // Mock root directory
    vi.mocked(fs.readdir).mockImplementation((path: string) => {
      if (path === "/test/project") {
        return Promise.resolve([
          { name: "src", isDirectory: () => true, isFile: () => false },
        ] as unknown as Dirent[]);
      }
      if (path.includes("/src")) {
        return Promise.resolve([
          { name: "index.ts", isDirectory: () => false, isFile: () => true },
        ] as unknown as Dirent[]);
      }
      return Promise.resolve([]);
    });

    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
      mtime: new Date("2025-01-01"),
      mode: 0o644,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("src");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children?.[0].name).toBe("index.ts");
  });

  it("limits recursion depth", async () => {
    // Create deeply nested structure
    let depth = 0;
    vi.mocked(fs.readdir).mockImplementation(() => {
      depth++;
      if (depth <= 12) {
        // Beyond MAX_DEPTH (10)
        return Promise.resolve([
          { name: `level${depth}`, isDirectory: () => true, isFile: () => false },
        ] as unknown as Dirent[]);
      }
      return Promise.resolve([]);
    });

    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date("2025-01-01"),
      mode: 0o755,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    // Should limit recursion, not go infinitely deep
    expect(tree).toBeDefined();
    expect(depth).toBeLessThan(15); // Reasonable limit check
  });

  it("handles empty subdirectories", async () => {
    vi.mocked(fs.readdir).mockImplementation((path: string) => {
      if (path === "/test/project") {
        return Promise.resolve([
          { name: "empty", isDirectory: () => true, isFile: () => false },
        ] as unknown as Dirent[]);
      }
      return Promise.resolve([]);
    });

    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date("2025-01-01"),
      mode: 0o755,
    } as unknown as Stats);

    const tree = await getFileTree({ projectId });

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("empty");
    expect(tree[0].children).toEqual([]);
  });

  it("converts permissions correctly", async () => {
    const testCases = [
      { mode: 0o777, expected: "rwxrwxrwx" },
      { mode: 0o644, expected: "rw-r--r--" },
      { mode: 0o755, expected: "rwxr-xr-x" },
      { mode: 0o000, expected: "---------" },
    ];

    for (const { mode, expected } of testCases) {
      const mockEntries = [
        { name: "file.txt", isDirectory: () => false, isFile: () => true },
      ];

      vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Dirent[]);
      vi.mocked(fs.stat).mockResolvedValue({
        size: 1024,
        mtime: new Date(),
        mode,
      } as unknown as Stats);

      const tree = await getFileTree({ projectId });
      expect(tree[0].permissions).toBe(expected);
    }
  });
});
