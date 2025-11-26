import simpleGit from 'simple-git'
import type { ResetToCommitOptions } from '../types/ResetToCommitOptions'

/**
 * Reset to a specific commit with mode (soft, mixed, hard)
 */
export async function resetToCommit({
  projectPath,
  commitHash,
  mode
}: ResetToCommitOptions): Promise<void> {
  const git = simpleGit(projectPath);
  const modeFlag = `--${mode}`;
  await git.reset([modeFlag, commitHash]);
}
