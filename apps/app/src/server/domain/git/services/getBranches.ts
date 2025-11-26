import simpleGit from 'simple-git'
import type { GitBranch } from '@/shared/types/git.types'
import type { GetBranchesOptions } from '../types/GetBranchesOptions'

/**
 * Get all branches in the repository
 */
export async function getBranches({ projectPath }: GetBranchesOptions): Promise<GitBranch[]> {
  try {
    const git = simpleGit(projectPath);
    const branchSummary = await git.branch();

    const branches: GitBranch[] = Object.keys(branchSummary.branches).map((name) => ({
      name,
      current: name === branchSummary.current,
    }));

    // Sort alphabetically
    branches.sort((a, b) => a.name.localeCompare(b.name));

    return branches;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const errorMessage = err.message.toLowerCase();

    // Provide specific error messages for common git failures
    if (errorMessage.includes('not a git repository')) {
      throw new Error(`Not a git repository: ${projectPath}`);
    }

    if (errorMessage.includes('enoent') || errorMessage.includes('no such file')) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    if (errorMessage.includes('permission denied') || errorMessage.includes('eacces')) {
      throw new Error(`Permission denied accessing repository: ${projectPath}`);
    }

    // Re-throw with context for other errors
    throw new Error(`Failed to get branches for ${projectPath}: ${err.message}`);
  }
}
