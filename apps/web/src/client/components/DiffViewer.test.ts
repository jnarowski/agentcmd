import { describe, it, expect } from "vitest";
import type { Change } from "diff";

/**
 * Extract only relevant context lines from a diff
 * Shows 2 lines before the first change and 2 lines after the last change
 * Trims excess unchanged lines in the middle
 *
 * Note: diffLines() groups consecutive unchanged lines into a single Change object,
 * so we need to split those grouped changes to extract only the requested context lines.
 *
 * @param changes - Full diff output from diffLines()
 * @param contextLines - Number of context lines to show before/after changes (default: 2)
 * @returns Trimmed diff with only relevant context
 */
function extractDiffWithContext(
  changes: Change[],
  contextLines: number = 2
): Change[] {
  if (changes.length === 0) return changes;

  // Find indices of first and last changed blocks
  let firstChangeIndex = -1;
  let lastChangeIndex = -1;

  for (let i = 0; i < changes.length; i++) {
    if (changes[i].added || changes[i].removed) {
      if (firstChangeIndex === -1) firstChangeIndex = i;
      lastChangeIndex = i;
    }
  }

  // If no changes found, return all (shouldn't happen in practice)
  if (firstChangeIndex === -1) return changes;

  const result: Change[] = [];

  // Process the change block before the first change
  if (firstChangeIndex > 0) {
    const beforeBlock = changes[firstChangeIndex - 1];
    const lines = beforeBlock.value.split("\n");
    // Remove the trailing empty string from split if present
    if (lines[lines.length - 1] === "") lines.pop();

    // Take only the last N lines (context before the change)
    const contextStart = Math.max(0, lines.length - contextLines);
    const contextLines_before = lines.slice(contextStart);

    if (contextLines_before.length > 0) {
      result.push({
        value: contextLines_before.join("\n") + "\n",
        added: false,
        removed: false,
      });
    }
  }

  // Add all the change blocks (and any unchanged blocks between them)
  for (let i = firstChangeIndex; i <= lastChangeIndex; i++) {
    result.push(changes[i]);
  }

  // Process the change block after the last change
  if (lastChangeIndex < changes.length - 1) {
    const afterBlock = changes[lastChangeIndex + 1];
    const lines = afterBlock.value.split("\n");
    // Remove the trailing empty string from split if present
    if (lines[lines.length - 1] === "") lines.pop();

    // Take only the first N lines (context after the change)
    const contextLines_after = lines.slice(0, contextLines);

    if (contextLines_after.length > 0) {
      result.push({
        value: contextLines_after.join("\n") + (lines.length > contextLines ? "\n" : afterBlock.value.endsWith("\n") ? "\n" : ""),
        added: false,
        removed: false,
      });
    }
  }

  return result;
}

describe("extractDiffWithContext", () => {
  it("should extract 2 lines before and 2 lines after a single change (grouped)", () => {
    // This is how diffLines() actually groups consecutive unchanged lines
    const changes: Change[] = [
      { value: "line 1\nline 2\nline 3\nline 4\n", added: false, removed: false },
      { value: "old line\n", removed: true },
      { value: "new line\n", added: true },
      { value: "line 5\nline 6\nline 7\nline 8\n", added: false, removed: false },
    ];

    const result = extractDiffWithContext(changes, 2);

    // Should include: last 2 from before block, change blocks, first 2 from after block
    expect(result).toHaveLength(4);
    expect(result[0].value).toBe("line 3\nline 4\n"); // Last 2 lines from before block
    expect(result[0].added).toBe(false);
    expect(result[0].removed).toBe(false);
    expect(result[1].value).toBe("old line\n");
    expect(result[1].removed).toBe(true);
    expect(result[2].value).toBe("new line\n");
    expect(result[2].added).toBe(true);
    expect(result[3].value).toBe("line 5\nline 6\n"); // First 2 lines from after block
    expect(result[3].added).toBe(false);
    expect(result[3].removed).toBe(false);
  });

  it("should handle changes at the beginning (less than 2 lines before)", () => {
    const changes: Change[] = [
      { value: "line 1\n", added: false, removed: false },
      { value: "old line\n", removed: true },
      { value: "new line\n", added: true },
      { value: "line 2\nline 3\nline 4\n", added: false, removed: false },
    ];

    const result = extractDiffWithContext(changes, 2);

    // Should include: line 1 (all available before context), changes, first 2 after
    expect(result).toHaveLength(4);
    expect(result[0].value).toBe("line 1\n"); // Only 1 line available before
    expect(result[1].value).toBe("old line\n");
    expect(result[2].value).toBe("new line\n");
    expect(result[3].value).toBe("line 2\nline 3\n"); // First 2 from after block
  });

  it("should handle changes at the end (less than 2 lines after)", () => {
    const changes: Change[] = [
      { value: "line 1\nline 2\nline 3\nline 4\n", added: false, removed: false },
      { value: "old line\n", removed: true },
      { value: "new line\n", added: true },
      { value: "line 5\n", added: false, removed: false },
    ];

    const result = extractDiffWithContext(changes, 2);

    // Should include: last 2 before, changes, line 5 (all available after context)
    expect(result).toHaveLength(4);
    expect(result[0].value).toBe("line 3\nline 4\n"); // Last 2 from before block
    expect(result[1].value).toBe("old line\n");
    expect(result[2].value).toBe("new line\n");
    expect(result[3].value).toBe("line 5\n"); // Only 1 line available after
  });

  it("should handle multiple separate changes (keep all changes and context)", () => {
    const changes: Change[] = [
      { value: "line 1\nline 2\n", added: false, removed: false },
      { value: "old line 1\n", removed: true },
      { value: "new line 1\n", added: true },
      { value: "line 3\nline 4\nline 5\n", added: false, removed: false },
      { value: "old line 2\n", removed: true },
      { value: "new line 2\n", added: true },
      { value: "line 6\nline 7\n", added: false, removed: false },
    ];

    const result = extractDiffWithContext(changes, 2);

    // Should include: last 2 before first change, all change blocks and unchanged between, first 2 after last change
    expect(result).toHaveLength(7);
    expect(result[0].value).toBe("line 1\nline 2\n"); // Last 2 (all) from before block
    expect(result[1].value).toBe("old line 1\n");
    expect(result[2].value).toBe("new line 1\n");
    expect(result[3].value).toBe("line 3\nline 4\nline 5\n"); // Unchanged block between changes (kept as-is)
    expect(result[4].value).toBe("old line 2\n");
    expect(result[5].value).toBe("new line 2\n");
    expect(result[6].value).toBe("line 6\nline 7\n"); // First 2 (all) from after block
  });

  it("should handle no changes (return all)", () => {
    const changes: Change[] = [
      { value: "line 1\nline 2\nline 3\n", added: false, removed: false },
    ];

    const result = extractDiffWithContext(changes, 2);

    // No changes, should return all
    expect(result).toHaveLength(1);
    expect(result).toEqual(changes);
  });

  it("should handle empty changes array", () => {
    const changes: Change[] = [];

    const result = extractDiffWithContext(changes, 2);

    expect(result).toHaveLength(0);
  });

  it("should handle only changes (no context)", () => {
    const changes: Change[] = [
      { value: "old line 1\n", removed: true },
      { value: "new line 1\n", added: true },
      { value: "old line 2\n", removed: true },
      { value: "new line 2\n", added: true },
    ];

    const result = extractDiffWithContext(changes, 2);

    // All are changes, should return all
    expect(result).toHaveLength(4);
    expect(result).toEqual(changes);
  });

  it("should respect custom context line count", () => {
    const changes: Change[] = [
      { value: "line 1\nline 2\nline 3\nline 4\n", added: false, removed: false },
      { value: "old line\n", removed: true },
      { value: "new line\n", added: true },
      { value: "line 5\nline 6\nline 7\n", added: false, removed: false },
    ];

    const result = extractDiffWithContext(changes, 1);

    // Should include: last 1 before, changes, first 1 after
    expect(result).toHaveLength(4);
    expect(result[0].value).toBe("line 4\n"); // Last 1 line from before block
    expect(result[1].value).toBe("old line\n");
    expect(result[2].value).toBe("new line\n");
    expect(result[3].value).toBe("line 5\n"); // First 1 line from after block
  });
});
