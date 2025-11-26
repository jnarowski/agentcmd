import { describe, it, expect } from "vitest";
import {
  flattenFileTree,
  extractFileReferences,
  insertAtCursor,
  removeAllOccurrences,
  getFileTypeInfo,
} from "./fileUtils";
import type { FileTreeItem } from "@/shared/types/file.types";

describe("flattenFileTree", () => {
  it("should return empty array for empty tree", () => {
    const result = flattenFileTree([]);
    expect(result).toEqual([]);
  });

  it("should extract correct properties from single file", () => {
    const tree: FileTreeItem[] = [
      {
        name: "test.ts",
        path: "src/test.ts",
        type: "file",
      },
    ];

    const result = flattenFileTree(tree);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      filename: "test.ts",
      directory: "src",
      fullPath: "src/test.ts",
      extension: "ts",
    });
  });

  it("should flatten nested directories correctly", () => {
    const tree: FileTreeItem[] = [
      {
        name: "src",
        path: "src",
        type: "directory",
        children: [
          {
            name: "components",
            path: "src/components",
            type: "directory",
            children: [
              {
                name: "Button.tsx",
                path: "src/components/Button.tsx",
                type: "file",
              },
            ],
          },
        ],
      },
    ];

    const result = flattenFileTree(tree);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      filename: "Button.tsx",
      directory: "src/components",
      fullPath: "src/components/Button.tsx",
      extension: "tsx",
    });
  });

  it("should handle deep nesting (3+ levels)", () => {
    const tree: FileTreeItem[] = [
      {
        name: "apps",
        path: "apps",
        type: "directory",
        children: [
          {
            name: "web",
            path: "apps/app",
            type: "directory",
            children: [
              {
                name: "src",
                path: "apps/app/src",
                type: "directory",
                children: [
                  {
                    name: "index.ts",
                    path: "apps/app/src/index.ts",
                    type: "file",
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const result = flattenFileTree(tree);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      filename: "index.ts",
      directory: "apps/app/src",
      fullPath: "apps/app/src/index.ts",
      extension: "ts",
    });
  });

  it("should handle multiple files in same directory", () => {
    const tree: FileTreeItem[] = [
      {
        name: "src",
        path: "src",
        type: "directory",
        children: [
          {
            name: "file1.ts",
            path: "src/file1.ts",
            type: "file",
          },
          {
            name: "file2",
            path: "src/file2",
            type: "file",
          },
          {
            name: "README.md",
            path: "src/README.md",
            type: "file",
          },
        ],
      },
    ];

    const result = flattenFileTree(tree);
    expect(result).toHaveLength(3);
    expect(result[0].filename).toBe("file1.ts");
    expect(result[1].filename).toBe("file2");
    expect(result[2].filename).toBe("README.md");
  });

  it("should handle files in root directory", () => {
    const tree: FileTreeItem[] = [
      {
        name: "package.json",
        path: "package.json",
        type: "file",
      },
    ];

    const result = flattenFileTree(tree);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      filename: "package.json",
      directory: "/",
      fullPath: "package.json",
      extension: "json",
    });
  });
});

describe("extractFileReferences", () => {
  it("should find single file path in text", () => {
    const text = "Check out src/components/Button.tsx for the implementation";
    const result = extractFileReferences(text);
    expect(result).toEqual(["src/components/Button.tsx"]);
  });

  it("should find multiple file paths", () => {
    const text = "See src/utils.ts and lib/helpers.js for details";
    const result = extractFileReferences(text);
    expect(result).toContain("src/utils.ts");
    expect(result).toContain("lib/helpers.js");
    expect(result).toHaveLength(2);
  });

  it("should return empty array for no matches", () => {
    const text = "This is just plain text with no file paths";
    const result = extractFileReferences(text);
    expect(result).toEqual([]);
  });

  it("should handle paths with hyphens and underscores", () => {
    const text = "Files: my-component.tsx and test_utils.ts";
    const result = extractFileReferences(text);
    expect(result).toContain("my-component.tsx");
    expect(result).toContain("test_utils.ts");
  });

  it("should not match incomplete paths", () => {
    const text = "Just the word component without extension";
    const result = extractFileReferences(text);
    expect(result).toEqual([]);
  });

  it("should handle empty string", () => {
    const result = extractFileReferences("");
    expect(result).toEqual([]);
  });

  it("should return unique paths only", () => {
    const text = "test.ts and test.ts again test.ts";
    const result = extractFileReferences(text);
    expect(result).toEqual(["test.ts"]);
  });
});

describe("insertAtCursor", () => {
  it("should insert at position 0 (beginning)", () => {
    const result = insertAtCursor("world", "Hello ", 0);
    expect(result.text).toBe("Hello world");
    expect(result.cursorPosition).toBe(6);
  });

  it("should insert at middle position", () => {
    const result = insertAtCursor("Hello world", " beautiful", 5);
    expect(result.text).toBe("Hello beautiful world");
    expect(result.cursorPosition).toBe(15);
  });

  it("should insert at end position", () => {
    const result = insertAtCursor("Hello", " world", 5);
    expect(result.text).toBe("Hello world");
    expect(result.cursorPosition).toBe(11);
  });

  it("should return correct new cursor position", () => {
    const text = "Test";
    const insertion = "ing";
    const result = insertAtCursor(text, insertion, 4);
    expect(result.cursorPosition).toBe(7); // 4 + 3
  });

  it("should handle empty string", () => {
    const result = insertAtCursor("", "Hello", 0);
    expect(result.text).toBe("Hello");
    expect(result.cursorPosition).toBe(5);
  });

  it("should handle file path insertion", () => {
    const text = "Check  for details";
    const filePath = "src/utils.ts";
    const atPosition = 6; // Position after space where @ was
    const result = insertAtCursor(text, filePath, atPosition);
    expect(result.text).toBe("Check src/utils.ts for details");
    expect(result.cursorPosition).toBe(18);
  });
});

describe("removeAllOccurrences", () => {
  it("should remove single occurrence", () => {
    const text = "File: src/test.ts";
    const result = removeAllOccurrences(text, "src/test.ts");
    expect(result).toBe("File: ");
  });

  it("should remove multiple occurrences", () => {
    const text = "test.ts is great, test.ts is useful, test.ts works";
    const result = removeAllOccurrences(text, "test.ts");
    expect(result).toBe(" is great,  is useful,  works");
  });

  it("should return unchanged if path not found", () => {
    const text = "No file paths here";
    const result = removeAllOccurrences(text, "test.ts");
    expect(result).toBe("No file paths here");
  });

  it("should not remove partial matches", () => {
    const text = "src/test.ts and src/test.tsx are different";
    const result = removeAllOccurrences(text, "src/test.ts");
    expect(result).toBe(" and src/test.tsx are different");
  });

  it("should handle special characters in path", () => {
    const text = "File: src/my-file.test.ts";
    const result = removeAllOccurrences(text, "src/my-file.test.ts");
    expect(result).toBe("File: ");
  });

  it("should handle paths with dots and slashes", () => {
    const text = "Check ../utils/helper.js for reference";
    const result = removeAllOccurrences(text, "../utils/helper.js");
    expect(result).toBe("Check  for reference");
  });
});

describe("getFileTypeInfo", () => {
  it("should return correct info for .ts", () => {
    const result = getFileTypeInfo("ts");
    expect(result).toEqual({ label: "TS", color: "#3b82f6" });
  });

  it("should return correct info for .tsx", () => {
    const result = getFileTypeInfo("tsx");
    expect(result).toEqual({ label: "TS", color: "#3b82f6" });
  });

  it("should return correct info for ", () => {
    const result = getFileTypeInfo("js");
    expect(result).toEqual({ label: "JS", color: "#eab308" });
  });

  it("should return correct info for .jsx", () => {
    const result = getFileTypeInfo("jsx");
    expect(result).toEqual({ label: "JS", color: "#eab308" });
  });

  it("should return correct info for .json", () => {
    const result = getFileTypeInfo("json");
    expect(result).toEqual({ label: "JSON", color: "#6b7280" });
  });

  it("should return correct info for .md", () => {
    const result = getFileTypeInfo("md");
    expect(result).toEqual({ label: "MD", color: "#22c55e" });
  });

  it("should return default for unknown extension", () => {
    const result = getFileTypeInfo("xyz");
    expect(result).toEqual({ label: "FILE", color: "#9ca3af" });
  });

  it("should handle uppercase extensions", () => {
    const result = getFileTypeInfo("TS");
    expect(result).toEqual({ label: "TS", color: "#3b82f6" });
  });
});
