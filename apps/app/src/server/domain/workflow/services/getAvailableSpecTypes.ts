import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { parseSpecCommandMetadata } from "@/server/domain/workflow/utils/parseSpecCommandMetadata";
import type { SpecTypeMetadata } from "@/server/domain/workflow/types/specType";

/**
 * Discover available spec types by scanning .claude/commands/cmd/ directory
 * for files matching pattern: generate-*-spec.md
 *
 * Returns array of spec type metadata with id, name, description, command path
 */
export async function getAvailableSpecTypes(
  projectPath: string
): Promise<SpecTypeMetadata[]> {
  const commandsDir = join(projectPath, ".claude", "commands", "cmd");

  try {
    // Read directory
    const files = await readdir(commandsDir);

    // Filter for spec generation commands
    const specFiles = files.filter((f) => /^generate-.+-spec\.md$/.test(f));

    // Parse each file
    const specTypes = await Promise.all(
      specFiles.map(async (filename) => {
        const filePath = join(commandsDir, filename);
        const content = await readFile(filePath, "utf-8");
        return parseSpecCommandMetadata(filename, content, filePath);
      })
    );

    return specTypes;
  } catch (error) {
    // Gracefully handle missing directory
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
