import fs from "fs/promises";
import path from "path";
import { getClaudeProjectsDir } from "@/server/utils/path";
import type { HasEnoughSessionsOptions } from "@/server/domain/project/types/HasEnoughSessionsOptions";

/**
 * Check if a file is a valid session file
 * Valid files must end with .jsonl and NOT start with "agent-"
 * @param filename - The filename to check
 * @returns True if valid session file, false otherwise
 */
function isValidSessionFile(filename: string): boolean {
  return filename.endsWith('.jsonl') && !filename.startsWith('agent-');
}

/**
 * Check if a project directory has more than minSessions sessions
 * @param options - Options object with projectName and minSessions
 * @returns True if project has more than minSessions
 */
export async function hasEnoughSessions({ projectName, minSessions = 3 }: HasEnoughSessionsOptions): Promise<boolean> {
  const projectDir = path.join(getClaudeProjectsDir(), projectName);

  try {
    await fs.access(projectDir);
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter(isValidSessionFile);

    // Check if project has more than minSessions sessions
    return jsonlFiles.length > minSessions;
  } catch {
    return false;
  }
}
