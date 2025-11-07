/**
 * Unified diff viewer component
 * Displays diffs with language-specific syntax highlighting
 * Supports both pre-formatted git diff strings and old/new string pairs
 */

import { useEffect, useState } from "react";
import { diffLines, type Change } from "diff";
import { codeToHtml, type BundledLanguage } from "shiki";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";

interface DiffViewerProps {
  // Pre-formatted diff string (from git commands)
  diff?: string;
  // Old/new string pairs (for AI edit tool)
  oldString?: string;
  newString?: string;
  filePath?: string;
  // Language for syntax highlighting
  language?: string;
  // Display options
  className?: string;
}

/**
 * Detect language from file path extension
 */
function detectLanguage(filePath?: string): string {
  if (!filePath) return "typescript";

  const ext = filePath.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    cpp: "cpp",
    c: "c",
    css: "css",
    html: "html",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
  };

  return langMap[ext || ""] || "typescript";
}

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
        count: contextLines_before.length,
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
      const value = contextLines_after.join("\n") +
          (lines.length > contextLines
            ? "\n"
            : afterBlock.value.endsWith("\n")
              ? "\n"
              : "");
      result.push({
        value,
        count: contextLines_after.length,
        added: false,
        removed: false,
      });
    }
  }

  return result;
}

/**
 * Parse git diff format into line changes
 */
function parseGitDiff(diffString: string): Change[] {
  const lines = diffString.split("\n");
  const changes: Change[] = [];
  let currentChunk: string[] = [];
  let currentType: "added" | "removed" | "unchanged" | null = null;

  const flushChunk = () => {
    if (currentChunk.length > 0 && currentType) {
      changes.push({
        value: currentChunk.join("\n") + "\n",
        count: currentChunk.length,
        added: currentType === "added",
        removed: currentType === "removed",
      });
      currentChunk = [];
      currentType = null;
    }
  };

  for (const line of lines) {
    // Skip headers
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("Index: ") ||
      line.startsWith("===") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ") ||
      line.startsWith("@@ ")
    ) {
      continue;
    }

    let type: "added" | "removed" | "unchanged";
    let content: string;

    if (line.startsWith("+")) {
      type = "added";
      content = line.slice(1);
    } else if (line.startsWith("-")) {
      type = "removed";
      content = line.slice(1);
    } else {
      type = "unchanged";
      content = line.startsWith(" ") ? line.slice(1) : line;
    }

    // If type changed, flush current chunk
    if (currentType && currentType !== type) {
      flushChunk();
    }

    currentType = type;
    currentChunk.push(content);
  }

  flushChunk();
  return changes;
}

/**
 * Unified diff viewer that handles both git diffs and old/new string pairs
 * Uses language-specific syntax highlighting with custom diff styling
 * Automatically adapts to light/dark mode
 */
export function DiffViewer({
  diff,
  oldString,
  newString,
  filePath,
  language,
  className = "",
}: DiffViewerProps) {
  const [html, setHtml] = useState<string>("");
  const { shikiTheme, colors } = useCodeBlockTheme();

  // Detect language if not provided
  const lang = language || detectLanguage(filePath);

  // Highlight diff with language-specific syntax highlighting
  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        // Get line changes from either diff string or old/new strings
        let changes: Change[] = [];

        if (diff) {
          changes = parseGitDiff(diff);
        } else if (oldString !== undefined && newString !== undefined) {
          changes = diffLines(oldString, newString);
        }

        // Handle edge cases
        if (changes.length === 0) {
          setHtml(
            `<div class="text-muted-foreground text-xs p-4">No changes to display</div>`
          );
          return;
        }

        // Extract only relevant context (2 lines before/after changes)
        changes = extractDiffWithContext(changes, 2);

        const htmlLines: string[] = [];

        for (const part of changes) {
          // Skip empty parts
          if (!part.value.trim()) continue;

          // Determine styling based on change type
          const bgColor = part.added
            ? colors.addedBackground
            : part.removed
              ? colors.removedBackground
              : colors.unchangedBackground;
          const symbol = part.added ? "+" : part.removed ? "-" : " ";

          // Extract lines from the part
          const lines = part.value.split("\n").filter((l) => l.length > 0);

          for (const line of lines) {
            // Highlight each line
            try {
              const lineHighlighted = await codeToHtml(line, {
                lang: lang as BundledLanguage,
                theme: shikiTheme,
              });

              // Extract just the code content from the pre/code tags
              const codeMatch = lineHighlighted.match(
                /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/s
              );
              const codeContent = codeMatch ? codeMatch[1] : escapeHtml(line);

              htmlLines.push(`
                <div class="diff-line" style="background: ${bgColor}; display: grid; grid-template-columns: 2ch 1fr; align-items: center; line-height: 1.5;">
                  <div class="diff-gutter" style="text-align: center; color: #888; background: ${colors.gutterBackground}; padding: 0 4px; user-select: none; border-right: 1px solid ${colors.border};">${symbol}</div>
                  <div class="diff-code" style="overflow-x: auto; padding: 0 8px;"><code style="white-space: pre;">${codeContent}</code></div>
                </div>
              `);
            } catch (lineError) {
              // If highlighting fails for this line, fall back to plain text
              console.warn("Failed to highlight line:", lineError);
              htmlLines.push(`
                <div class="diff-line" style="background: ${bgColor}; display: grid; grid-template-columns: 2ch 1fr; align-items: center; line-height: 1.5;">
                  <div class="diff-gutter" style="text-align: center; color: #888; background: ${colors.gutterBackground}; padding: 0 4px; user-select: none; border-right: 1px solid ${colors.border};">${symbol}</div>
                  <div class="diff-code" style="overflow-x: auto; padding: 0 8px;"><code style="white-space: pre;">${escapeHtml(line)}</code></div>
                </div>
              `);
            }
          }
        }

        if (!cancelled) {
          setHtml(htmlLines.join(""));
        }
      } catch (error) {
        console.warn("Diff highlighting failed:", error);
        // Fallback to plain text with reconstructed changes
        if (!cancelled) {
          // Reconstruct changes for fallback
          let fallbackChanges: Change[] = [];
          if (diff) {
            fallbackChanges = parseGitDiff(diff);
          } else if (oldString !== undefined && newString !== undefined) {
            fallbackChanges = diffLines(oldString, newString);
          }

          // Extract context for fallback too
          fallbackChanges = extractDiffWithContext(fallbackChanges, 2);

          const plainLines = fallbackChanges
            .map((part) => {
              const symbol = part.added ? "+" : part.removed ? "-" : " ";
              return part.value
                .split("\n")
                .filter((l) => l.length > 0)
                .map((line) => `${symbol} ${escapeHtml(line)}`)
                .join("\n");
            })
            .join("\n");
          setHtml(`<pre><code>${plainLines}</code></pre>`);
        }
      }
    };

    highlight();

    return () => {
      cancelled = true;
    };
  }, [diff, oldString, newString, lang, shikiTheme, colors]);

  return (
    <div
      className={`diff-viewer text-xs ${className}`}
      style={{
        fontFamily: "ui-monospace, monospace",
        backgroundColor: colors.background,
        paddingTop: "8px",
        paddingBottom: "8px",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
