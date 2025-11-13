import type { SpecTypeMetadata } from "@/server/domain/workflow/types/specType";

/**
 * Parse metadata from a spec command markdown file
 * Extracts:
 * - id from filename (e.g., "generate-feature-spec.md" → "feature")
 * - name from first # header
 * - description from first paragraph after header
 */
export function parseSpecCommandMetadata(
  filename: string,
  content: string,
  filePath: string
): SpecTypeMetadata {
  // Extract ID from filename pattern: generate-{id}-spec.md
  const idMatch = filename.match(/^generate-(.+)-spec\.md$/);
  const id = idMatch?.[1] ?? filename;

  // Construct command path
  const command = `/cmd:generate-${id}-spec`;

  // Parse markdown content
  const lines = content.split("\n").map((line) => line.trim());

  // Find first # header
  let name = id; // Fallback to ID
  let description = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract name from first # header
    if (line.startsWith("# ") && name === id) {
      name = line.substring(2).trim();
      continue;
    }

    // Extract description from first non-empty, non-header line after name
    if (name !== id && line && !line.startsWith("#")) {
      description = line;
      break;
    }
  }

  return {
    id,
    command,
    name,
    description,
    filePath,
  };
}
