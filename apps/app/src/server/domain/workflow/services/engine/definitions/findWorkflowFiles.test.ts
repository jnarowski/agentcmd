import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findWorkflowFiles } from "./findWorkflowFiles";

describe("findWorkflowFiles", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    testDir = join(tmpdir(), `test-workflow-files-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe("file discovery", () => {
    it("finds .ts and .js files in flat directory", async () => {
      // Arrange: Create workflow files
      await writeFile(join(testDir, "workflow1.ts"), "export default {}");
      await writeFile(join(testDir, "workflow2.js"), "module.exports = {}");
      await writeFile(join(testDir, "workflow3.ts"), "export default {}");

      // Act
      const files = await findWorkflowFiles(testDir);

      // Assert
      expect(files).toHaveLength(3);
      expect(files).toContain(join(testDir, "workflow1.ts"));
      expect(files).toContain(join(testDir, "workflow2.js"));
      expect(files).toContain(join(testDir, "workflow3.ts"));
    });

    it("finds files recursively in nested directories", async () => {
      // Arrange: Create nested structure
      await mkdir(join(testDir, "subdir1"), { recursive: true });
      await mkdir(join(testDir, "subdir2", "nested"), { recursive: true });

      await writeFile(join(testDir, "root.ts"), "export default {}");
      await writeFile(join(testDir, "subdir1", "file1.ts"), "export default {}");
      await writeFile(join(testDir, "subdir2", "file2.js"), "module.exports = {}");
      await writeFile(join(testDir, "subdir2", "nested", "deep.ts"), "export default {}");

      // Act
      const files = await findWorkflowFiles(testDir);

      // Assert
      expect(files).toHaveLength(4);
      expect(files).toContain(join(testDir, "root.ts"));
      expect(files).toContain(join(testDir, "subdir1", "file1.ts"));
      expect(files).toContain(join(testDir, "subdir2", "file2.js"));
      expect(files).toContain(join(testDir, "subdir2", "nested", "deep.ts"));
    });

    it("filters out non-workflow file types", async () => {
      // Arrange: Create mixed file types
      await writeFile(join(testDir, "workflow.ts"), "export default {}");
      await writeFile(join(testDir, "workflow.js"), "module.exports = {}");
      await writeFile(join(testDir, "readme.md"), "# README");
      await writeFile(join(testDir, "package.json"), "{}");
      await writeFile(join(testDir, "data.json"), "{}");
      await writeFile(join(testDir, "test.txt"), "text");
      await writeFile(join(testDir, "image.png"), "binary");

      // Act
      const files = await findWorkflowFiles(testDir);

      // Assert: Only .ts and .js files
      expect(files).toHaveLength(2);
      expect(files).toContain(join(testDir, "workflow.ts"));
      expect(files).toContain(join(testDir, "workflow.js"));
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty directory", async () => {
      // Arrange: Empty directory already created in beforeEach

      // Act
      const files = await findWorkflowFiles(testDir);

      // Assert
      expect(files).toEqual([]);
    });

    it("returns empty array for non-existent directory", async () => {
      // Arrange: Use path that doesn't exist
      const nonExistentDir = join(testDir, "does-not-exist");

      // Act
      const files = await findWorkflowFiles(nonExistentDir);

      // Assert: Should not throw, returns empty array
      expect(files).toEqual([]);
    });

    it("handles directory with only subdirectories and no files", async () => {
      // Arrange: Create empty subdirectories
      await mkdir(join(testDir, "empty1"), { recursive: true });
      await mkdir(join(testDir, "empty2", "nested"), { recursive: true });

      // Act
      const files = await findWorkflowFiles(testDir);

      // Assert
      expect(files).toEqual([]);
    });

    it("handles files with multiple dots in name", async () => {
      // Arrange: Files with complex names
      await writeFile(join(testDir, "workflow.config.ts"), "export default {}");
      await writeFile(join(testDir, "test.workflow.js"), "module.exports = {}");
      await writeFile(join(testDir, "my.workflow.spec.ts"), "export default {}");

      // Act
      const files = await findWorkflowFiles(testDir);

      // Assert: All should be found based on extension
      expect(files).toHaveLength(3);
      expect(files).toContain(join(testDir, "workflow.config.ts"));
      expect(files).toContain(join(testDir, "test.workflow.js"));
      expect(files).toContain(join(testDir, "my.workflow.spec.ts"));
    });
  });
});
