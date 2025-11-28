import { describe, it, expect } from "vitest";
import {
  searchFiles,
  scorePathMatch,
  scoreSegmentMatch,
  scoreDirectorySegments,
  scoreFilenameMatch,
  detectQueryType,
} from "./searchFiles";
import type { FileItem } from "@/client/pages/projects/files/utils/fileUtils";

// Test fixtures
const testFiles: FileItem[] = [
  {
    filename: "spec.md",
    directory: "todo/2511271430-preview-containers",
    fullPath: "todo/2511271430-preview-containers/spec.md",
    extension: "md",
  },
  {
    filename: "spec.md",
    directory: "backlog/containers-feature",
    fullPath: "backlog/containers-feature/spec.md",
    extension: "md",
  },
  {
    filename: "README.md",
    directory: "containers",
    fullPath: "containers/README.md",
    extension: "md",
  },
  {
    filename: "index.ts",
    directory: ".agent/specs/todo",
    fullPath: ".agent/specs/todo/index.ts",
    extension: "ts",
  },
  {
    filename: "spec.md",
    directory: "todo",
    fullPath: "todo/spec.md",
    extension: "md",
  },
  {
    filename: "Button.tsx",
    directory: "src/components",
    fullPath: "src/components/Button.tsx",
    extension: "tsx",
  },
  {
    filename: "ButtonGroup.tsx",
    directory: "src/components",
    fullPath: "src/components/ButtonGroup.tsx",
    extension: "tsx",
  },
  {
    filename: "utils.ts",
    directory: "src",
    fullPath: "src/utils.ts",
    extension: "ts",
  },
  {
    filename: "test.ts",
    directory: "test",
    fullPath: "test/test.ts",
    extension: "ts",
  },
  {
    filename: "helper.ts",
    directory: "testing",
    fullPath: "testing/helper.ts",
    extension: "ts",
  },
  {
    filename: "runner.ts",
    directory: "my-test-dir",
    fullPath: "my-test-dir/runner.ts",
    extension: "ts",
  },
];

describe("searchFiles", () => {
  describe("query type detection", () => {
    it("should detect path query with slash", () => {
      expect(detectQueryType("todo/spec.md")).toBe("path");
    });

    it("should detect filename query without slash", () => {
      expect(detectQueryType("containers")).toBe("filename");
    });
  });

  describe("path-based search", () => {
    it("should find exact path match", () => {
      const results = searchFiles(
        "todo/2511271430-preview-containers/spec.md",
        testFiles
      );
      expect(results[0].fullPath).toBe(
        "todo/2511271430-preview-containers/spec.md"
      );
    });

    it("should find path prefix match", () => {
      const results = searchFiles("todo/2511271430", testFiles);
      expect(results[0].directory).toContain("2511271430-preview-containers");
    });

    it("should prioritize exact over prefix", () => {
      const results = searchFiles("todo/spec.md", testFiles);
      expect(results[0].fullPath).toBe("todo/spec.md");
    });

    it("should handle nested path queries", () => {
      const results = searchFiles(".agent/specs", testFiles);
      expect(results.some((r) => r.directory.includes(".agent/specs"))).toBe(
        true
      );
    });

    it("should handle special characters in paths", () => {
      const results = searchFiles(".agent", testFiles);
      expect(results.some((r) => r.directory.includes(".agent"))).toBe(true);
    });

    it("should find partial path matches", () => {
      // Query: "todo/spec.md" should match ".agent/specs/todo/spec.md"
      const results = searchFiles("specs/todo", testFiles);
      expect(results.some((r) => r.fullPath.includes("specs/todo"))).toBe(true);
    });

    it("should prioritize exact > prefix > contains for paths", () => {
      const filesWithVariants: FileItem[] = [
        {
          filename: "spec.md",
          directory: "todo",
          fullPath: "todo/spec.md",
          extension: "md",
        },
        {
          filename: "spec.md",
          directory: "todo/spec.md-backup",
          fullPath: "todo/spec.md-backup/spec.md", // True prefix match
          extension: "md",
        },
        {
          filename: "spec.md",
          directory: ".agent/specs/todo",
          fullPath: ".agent/specs/todo/spec.md",
          extension: "md",
        },
      ];
      const results = searchFiles("todo/spec.md", filesWithVariants);
      // Exact match should be first
      expect(results[0].fullPath).toBe("todo/spec.md");
      // Prefix match should be second
      expect(results[1].fullPath).toBe("todo/spec.md-backup/spec.md");
      // Contains match should be third
      expect(results[2].fullPath).toBe(".agent/specs/todo/spec.md");
    });
  });

  describe("folder search", () => {
    it("should find exact folder name", () => {
      const results = searchFiles("todo", testFiles);
      expect(results.every((r) => r.directory.includes("todo"))).toBe(true);
    });

    it("should find partial folder ID", () => {
      const results = searchFiles("2511271430", testFiles);
      expect(results[0].directory).toContain("2511271430-preview-containers");
    });

    it("should prioritize exact segment over substring", () => {
      const results = searchFiles("containers", testFiles);
      const exactIdx = results.findIndex((r) => r.directory === "containers");
      const partialIdx = results.findIndex((r) =>
        r.directory.includes("preview-containers")
      );
      expect(exactIdx).toBeGreaterThanOrEqual(0);
      expect(partialIdx).toBeGreaterThanOrEqual(0);
      expect(exactIdx).toBeLessThan(partialIdx);
    });

    it("should handle nested folder search", () => {
      const results = searchFiles("specs", testFiles);
      expect(results.some((r) => r.directory.includes("specs"))).toBe(true);
    });

    it("should handle multi-segment folder", () => {
      const results = searchFiles("preview-containers", testFiles);
      expect(results[0].directory).toContain("preview-containers");
    });

    it("should match folder with hyphens", () => {
      const results = searchFiles("preview", testFiles);
      expect(results.some((r) => r.directory.includes("preview"))).toBe(true);
    });
  });

  describe("filename search", () => {
    it("should find exact filename", () => {
      const results = searchFiles("spec.md", testFiles);
      expect(results.every((r) => r.filename === "spec.md")).toBe(true);
    });

    it("should find partial filename", () => {
      const results = searchFiles("spec", testFiles);
      // Search for "spec" matches both filenames and directories containing "spec"
      expect(
        results.every(
          (r) => r.filename.includes("spec") || r.fullPath.includes("spec")
        )
      ).toBe(true);
    });

    it("should prioritize filename prefix", () => {
      const results = searchFiles("Button", testFiles);
      expect(results[0].filename).toBe("Button.tsx");
      expect(results[1].filename).toBe("ButtonGroup.tsx");
    });

    it("should search by extension", () => {
      const results = searchFiles(".ts", testFiles);
      expect(results.every((r) => r.filename.includes(".ts"))).toBe(true);
    });
  });

  describe("prioritization", () => {
    it("should prioritize exact folder segment over substring", () => {
      const results = searchFiles("containers", testFiles);
      const exactIdx = results.findIndex((r) => r.directory === "containers");
      const substringIdx = results.findIndex((r) =>
        r.directory.includes("containers-feature")
      );
      expect(exactIdx).toBeLessThan(substringIdx);
    });

    it("should prioritize path prefix over filename", () => {
      const results = searchFiles("todo/spec", testFiles);
      expect(results[0].directory).toContain("todo");
    });

    it("should use filename length as tiebreaker", () => {
      const files: FileItem[] = [
        {
          filename: "a.ts",
          directory: "src",
          fullPath: "src/a.ts",
          extension: "ts",
        },
        {
          filename: "abcdef.ts",
          directory: "src",
          fullPath: "src/abcdef.ts",
          extension: "ts",
        },
      ];
      const results = searchFiles("a", files);
      expect(results[0].filename).toBe("a.ts");
    });

    it("should prioritize earlier position in string", () => {
      const results = searchFiles("test", testFiles);
      const testTestIdx = results.findIndex(
        (r) => r.filename === "test.ts" && r.directory === "test"
      );
      const myTestIdx = results.findIndex(
        (r) => r.directory === "my-test-dir"
      );
      expect(testTestIdx).toBeGreaterThanOrEqual(0);
      expect(myTestIdx).toBeGreaterThanOrEqual(0);
      expect(testTestIdx).toBeLessThan(myTestIdx);
    });

    it("should be case insensitive", () => {
      const results = searchFiles("TODO", testFiles);
      expect(results.some((r) => r.directory.includes("todo"))).toBe(true);
    });

    it("should handle multiple segment matches", () => {
      const results = searchFiles("specs", testFiles);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should respect exact > prefix > contains hierarchy", () => {
      const results = searchFiles("test", testFiles);
      // Exact segment match (test/)
      const exactIdx = results.findIndex((r) => r.directory === "test");
      // Prefix segment match (testing/)
      const prefixIdx = results.findIndex((r) => r.directory === "testing");
      // Contains match (my-test-dir/)
      const containsIdx = results.findIndex(
        (r) => r.directory === "my-test-dir"
      );

      expect(exactIdx).toBeGreaterThanOrEqual(0);
      expect(prefixIdx).toBeGreaterThanOrEqual(0);
      expect(containsIdx).toBeGreaterThanOrEqual(0);
      expect(exactIdx).toBeLessThan(prefixIdx);
      expect(prefixIdx).toBeLessThan(containsIdx);
    });

    it("should prioritize segment match over filename contains", () => {
      const results = searchFiles("test", testFiles);
      // Files in test/ or testing/ should rank higher than files with "test" in name
      const segmentMatch = results.findIndex(
        (r) => r.directory === "test" || r.directory === "testing"
      );
      expect(segmentMatch).toBe(0); // Should be first
    });
  });

  describe("edge cases", () => {
    it("should handle empty query", () => {
      const results = searchFiles("", testFiles);
      expect(results).toEqual(testFiles);
    });

    it("should handle whitespace query", () => {
      const results = searchFiles("   ", testFiles);
      expect(results).toEqual(testFiles);
    });

    it("should return empty for no matches", () => {
      const results = searchFiles("nonexistent-xyz-123", testFiles, {
        useFuzzyFallback: false,
      });
      expect(results).toEqual([]);
    });

    it("should handle single character query", () => {
      const results = searchFiles("s", testFiles);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle special characters", () => {
      const results = searchFiles(".agent", testFiles);
      expect(results.some((r) => r.directory.includes(".agent"))).toBe(true);
    });

    it("should handle hyphens in query", () => {
      const results = searchFiles("preview-containers", testFiles);
      expect(results.some((r) => r.directory.includes("preview-containers")))
        .toBe(true);
    });
  });

  describe("performance", () => {
    it("should handle large file list efficiently", () => {
      const largeFileList: FileItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          filename: `file${i}.ts`,
          directory: `dir${i}`,
          fullPath: `dir${i}/file${i}.ts`,
          extension: "ts",
        })
      );

      const start = performance.now();
      searchFiles("file500", largeFileList);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // < 100ms
    });

    it("should respect maxResults limit", () => {
      const results = searchFiles("spec", testFiles, { maxResults: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should return quickly for no matches", () => {
      const start = performance.now();
      searchFiles("nonexistent", testFiles, { useFuzzyFallback: false });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // < 10ms
    });
  });

  describe("fuzzy fallback", () => {
    it("should use fuzzy search when no exact matches", () => {
      const results = searchFiles("spc", testFiles); // Typo
      expect(results.some((r) => r.filename.includes("spec"))).toBe(true);
    });

    it("should skip fuzzy when disabled", () => {
      const results = searchFiles("spc", testFiles, {
        useFuzzyFallback: false,
      });
      expect(results).toEqual([]);
    });

    it("should integrate fuzzy scores correctly", () => {
      const results = searchFiles("spcmd", testFiles); // Typo for "spec.md"
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

describe("scorePathMatch", () => {
  it("should score exact match highest", () => {
    const score = scorePathMatch("todo/spec.md", "todo/spec.md");
    expect(score).toBeGreaterThan(900);
  });

  it("should score prefix match high", () => {
    const score = scorePathMatch("todo", "todo/spec.md");
    expect(score).toBeGreaterThan(700);
    expect(score).toBeLessThan(900);
  });

  it("should return 0 for no match", () => {
    const score = scorePathMatch("backlog", "todo/spec.md");
    expect(score).toBe(0);
  });

  it("should be case insensitive", () => {
    const score = scorePathMatch("todo/spec.md", "TODO/SPEC.MD");
    expect(score).toBeGreaterThan(900);
  });

  it("should score path contains match", () => {
    const score = scorePathMatch("todo/spec.md", ".agent/specs/todo/spec.md");
    expect(score).toBeGreaterThan(550);
    expect(score).toBeLessThan(700);
  });

  it("should prioritize exact > prefix > contains", () => {
    const exactScore = scorePathMatch("todo/spec.md", "todo/spec.md");
    const prefixScore = scorePathMatch("todo/spec", "todo/spec.md");
    const containsScore = scorePathMatch("todo/spec.md", ".agent/specs/todo/spec.md");
    expect(exactScore).toBeGreaterThan(prefixScore);
    expect(prefixScore).toBeGreaterThan(containsScore);
  });
});

describe("scoreSegmentMatch", () => {
  it("should score exact segment highest", () => {
    const score = scoreSegmentMatch("containers", "containers");
    expect(score).toBeGreaterThan(600);
    expect(score).toBeLessThan(700);
  });

  it("should score prefix segment high", () => {
    const score = scoreSegmentMatch(
      "2511271430",
      "2511271430-preview-containers"
    );
    expect(score).toBeGreaterThan(400);
    expect(score).toBeLessThan(600);
  });

  it("should score contains match medium", () => {
    const score = scoreSegmentMatch(
      "preview",
      "2511271430-preview-containers"
    );
    expect(score).toBeGreaterThan(300);
    expect(score).toBeLessThan(500);
  });

  it("should return 0 for no match", () => {
    const score = scoreSegmentMatch("xyz", "containers");
    expect(score).toBe(0);
  });

  it("should be case insensitive", () => {
    const score = scoreSegmentMatch("CONTAINERS", "containers");
    expect(score).toBeGreaterThan(600);
  });
});

describe("scoreDirectorySegments", () => {
  it("should find best matching segment", () => {
    const score = scoreDirectorySegments("specs", ".agent/specs/todo");
    expect(score).toBeGreaterThan(0);
  });

  it("should handle multiple segments", () => {
    const score = scoreDirectorySegments("todo", ".agent/specs/todo");
    expect(score).toBeGreaterThan(0);
  });

  it("should return 0 for no segment match", () => {
    const score = scoreDirectorySegments("xyz", ".agent/specs/todo");
    expect(score).toBe(0);
  });

  it("should prioritize exact segment over contains", () => {
    const exactScore = scoreDirectorySegments("todo", "todo/subfolder");
    const containsScore = scoreDirectorySegments(
      "tod",
      "my-todo-folder/subfolder"
    );
    expect(exactScore).toBeGreaterThan(containsScore);
  });

  it("should handle directory contains when no segment match", () => {
    const score = scoreDirectorySegments(
      "preview",
      "2511271430-preview-containers"
    );
    expect(score).toBeGreaterThan(0);
  });
});

describe("scoreFilenameMatch", () => {
  it("should score exact filename highest", () => {
    const score = scoreFilenameMatch("spec.md", "spec.md");
    expect(score).toBeGreaterThan(290);
    expect(score).toBeLessThan(300);
  });

  it("should score prefix match high", () => {
    const score = scoreFilenameMatch("spec", "spec.md");
    expect(score).toBeGreaterThan(250);
    expect(score).toBeLessThan(300);
  });

  it("should score contains match lower", () => {
    const score = scoreFilenameMatch("pec", "spec.md");
    expect(score).toBeGreaterThan(200);
    expect(score).toBeLessThan(250);
  });

  it("should return 0 for no match", () => {
    const score = scoreFilenameMatch("xyz", "spec.md");
    expect(score).toBe(0);
  });

  it("should be case insensitive", () => {
    const score = scoreFilenameMatch("SPEC.MD", "spec.md");
    expect(score).toBeGreaterThan(290);
  });

  it("should penalize longer filenames for prefix matches", () => {
    const shortScore = scoreFilenameMatch("Button", "Button.tsx");
    const longScore = scoreFilenameMatch(
      "Button",
      "ButtonGroupWithVeryLongName.tsx"
    );
    expect(shortScore).toBeGreaterThan(longScore);
  });
});
