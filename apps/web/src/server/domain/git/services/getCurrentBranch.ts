import simpleGit from 'simple-git'
import type { GetCurrentBranchOptions } from '../types/GetCurrentBranchOptions'

/**
 * Get the current git branch for a project directory
 * Returns the branch name or null if not a git repository
 */
export async function getCurrentBranch({ projectPath }: GetCurrentBranchOptions): Promise<string | null> {
  try {
    const git = simpleGit(projectPath);

    // Check if directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return null;
    }

    // Get current branch
    const branch = await git.branch();
    return branch.current || null;
  } catch {
    // Gracefully handle non-git directories
    return null;
  }
}
