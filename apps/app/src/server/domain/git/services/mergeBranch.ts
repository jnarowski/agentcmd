import simpleGit from 'simple-git'
import type { GitMergeResult } from '@/shared/types/git.types'
import type { MergeBranchOptions } from '../types/MergeBranchOptions'

/**
 * Merge a branch into the current branch
 */
export async function mergeBranch({
  projectPath,
  sourceBranch,
  options
}: MergeBranchOptions): Promise<GitMergeResult> {
  try {
    const git = simpleGit(projectPath);
    const mergeOptions = [];

    if (options?.noFf) {
      mergeOptions.push('--no-ff');
    }

    await git.merge([sourceBranch, ...mergeOptions]);

    return {
      success: true,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Check if it's a merge conflict
    if (err.message.includes('CONFLICT') || err.message.includes('conflict')) {
      // Try to extract conflicted files
      const git = simpleGit(projectPath);
      const status = await git.status();
      const conflicts = status.conflicted || [];

      return {
        success: false,
        conflicts,
      };
    }

    throw error;
  }
}
