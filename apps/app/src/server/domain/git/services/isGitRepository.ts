import fs from "node:fs";
import path from "node:path";
import { getCurrentBranch } from "./getCurrentBranch";

export interface GitRepositoryStatus {
  initialized: boolean;
  error: string | null;
  branch: string | null;
}

/**
 * Fast git repository detection using filesystem check
 * Returns git status without running git commands
 */
export async function isGitRepository(
  projectPath: string
): Promise<GitRepositoryStatus> {
  try {
    const gitDir = path.join(projectPath, ".git");
    const initialized = fs.existsSync(gitDir);

    if (!initialized) {
      return {
        initialized: false,
        error: null,
        branch: null,
      };
    }

    // Get current branch if git is initialized
    const branch = await getCurrentBranch({ projectPath });

    return {
      initialized: true,
      error: null,
      branch,
    };
  } catch (error) {
    return {
      initialized: false,
      error: error instanceof Error ? error.message : "Unknown error",
      branch: null,
    };
  }
}
